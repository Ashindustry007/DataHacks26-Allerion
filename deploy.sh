#!/usr/bin/env bash
set -euo pipefail

# Allerion one-command deployment
# Usage:  ./deploy.sh                  (full deploy: build + push + terraform apply)
#         ./deploy.sh --plan           (dry run: build + push + terraform plan)
#         ./deploy.sh --destroy        (tear everything down)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
INFRA_DIR="$SCRIPT_DIR/infra"
TFVARS_FILE="$INFRA_DIR/terraform.tfvars"

# ── Preflight checks ────────────────────────────────────────────────────

for cmd in gcloud terraform jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is not installed" >&2
    exit 1
  fi
done

if [ ! -f "$TFVARS_FILE" ]; then
  echo "ERROR: $INFRA_DIR/terraform.tfvars not found."
  echo "Copy terraform.tfvars.example → terraform.tfvars and fill in your values."
  exit 1
fi

PROJECT_ID=$(grep 'project_id' "$TFVARS_FILE" | head -1 | sed 's/.*=\s*"\(.*\)"/\1/')
REGION=$(grep '^region' "$TFVARS_FILE" | head -1 | sed 's/.*=\s*"\(.*\)"/\1/')
REGION="${REGION:-us-central1}"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/allerion"
IMAGE_TAG="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'latest')"
IMAGE_URL="$REGISTRY/backend:$IMAGE_TAG"

echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Image:    $IMAGE_URL"
echo ""

# ── Handle --destroy ─────────────────────────────────────────────────────

if [[ "${1:-}" == "--destroy" ]]; then
  echo "==> Destroying infrastructure..."
  cd "$INFRA_DIR"
  terraform destroy -var "image_tag=$IMAGE_TAG" -auto-approve
  exit 0
fi

# ── Terraform init ───────────────────────────────────────────────────────

cd "$INFRA_DIR"
echo "==> terraform init..."
terraform init -upgrade

# ── Bootstrap: create Artifact Registry repo before pushing image ────────

echo "==> Ensuring Artifact Registry repo exists..."
terraform apply \
  -target=google_artifact_registry_repository.allerion \
  -var "image_tag=$IMAGE_TAG" \
  -auto-approve

# ── Build and push container image via Cloud Build ────────────────────────

echo "==> Building and pushing image via Cloud Build..."
gcloud builds submit "$BACKEND_DIR" \
  --tag "$IMAGE_URL" \
  --project "$PROJECT_ID" \
  --timeout=600s

# ── Full Terraform apply ─────────────────────────────────────────────────

TF_ACTION="apply -auto-approve"
if [[ "${1:-}" == "--plan" ]]; then
  TF_ACTION="plan"
fi

echo "==> terraform $TF_ACTION..."
terraform $TF_ACTION -var "image_tag=$IMAGE_TAG"

# ── Print outputs ────────────────────────────────────────────────────────

if [[ "${1:-}" != "--plan" ]]; then
  echo ""
  echo "════════════════════════════════════════════════"
  SERVICE_URL=$(terraform output -raw service_url)
  echo "  Allerion deployed: $SERVICE_URL"
  echo ""
  echo "  Endpoints:"
  echo "    GET  $SERVICE_URL/api/species"
  echo "    GET  $SERVICE_URL/api/forecast?lat=32.7&lng=-117.1"
  echo "    GET  $SERVICE_URL/api/heatmap?lat=32.7&lng=-117.1"
  echo "    POST $SERVICE_URL/api/profile"
  echo "    POST $SERVICE_URL/api/alerts/check"
  echo "    POST $SERVICE_URL/api/photo"
  echo "    POST $SERVICE_URL/api/ingest/delta"
  echo "    GET  $SERVICE_URL/docs   (Swagger UI)"
  echo "════════════════════════════════════════════════"
fi
