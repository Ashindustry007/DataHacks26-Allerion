terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# APIs are pre-enabled via gcloud by the project owner.
# Terraform reads their state but will not attempt to enable/disable them.

# --------------------------------------------------------------------------
# Artifact Registry — Docker repo for the container image
# --------------------------------------------------------------------------

resource "google_artifact_registry_repository" "allerion" {
  location      = var.region
  repository_id = "allerion"
  format        = "DOCKER"
}

locals {
  image_url = "${var.region}-docker.pkg.dev/${var.project_id}/allerion/backend:${var.image_tag}"
}

# --------------------------------------------------------------------------
# Service account for Cloud Run
# --------------------------------------------------------------------------

resource "google_service_account" "allerion" {
  account_id   = "allerion-run"
  display_name = "Allerion Cloud Run"
}

resource "google_project_iam_member" "firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.allerion.email}"
}

resource "google_project_iam_member" "fcm" {
  project = var.project_id
  role    = "roles/firebasecloudmessaging.admin"
  member  = "serviceAccount:${google_service_account.allerion.email}"
}

# --------------------------------------------------------------------------
# Firestore database (native mode)
# --------------------------------------------------------------------------

resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  lifecycle {
    ignore_changes = [location_id, type]
  }
}

# --------------------------------------------------------------------------
# Firestore composite index: observations(h3_cell ASC, observed_at ASC)
# --------------------------------------------------------------------------

resource "google_firestore_index" "obs_h3_time" {
  project    = var.project_id
  database   = "(default)"
  collection = "observations"

  fields {
    field_path = "h3_cell"
    order      = "ASCENDING"
  }
  fields {
    field_path = "observed_at"
    order      = "ASCENDING"
  }

  depends_on = [google_firestore_database.default]
}

# --------------------------------------------------------------------------
# Cloud Run service
# --------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "allerion" {
  name     = "allerion"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.allerion.email

    containers {
      image = local.image_url

      ports {
        container_port = 8080
      }

      env {
        name  = "USE_FIRESTORE"
        value = "true"
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_POLLEN_API_KEY"
        value = var.google_pollen_api_key
      }
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }
      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }
      env {
        name  = "INAT_APP_ID"
        value = var.inat_app_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/api/species"
        }
        initial_delay_seconds = 2
        period_seconds        = 5
        failure_threshold     = 3
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    timeout = "120s"
  }

  depends_on = [google_artifact_registry_repository.allerion]
}

# Allow unauthenticated access (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.allerion.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --------------------------------------------------------------------------
# Cloud Scheduler — periodic jobs
# --------------------------------------------------------------------------

resource "google_service_account" "scheduler" {
  account_id   = "allerion-scheduler"
  display_name = "Allerion Scheduler"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoke" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.allerion.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "ingest" {
  name      = "allerion-ingest"
  schedule  = var.ingest_schedule
  time_zone = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.allerion.uri}/api/ingest/delta"
    body        = base64encode(var.ingest_regions_json)
    headers = {
      "Content-Type" = "application/json"
    }
    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}

resource "google_cloud_scheduler_job" "alerts" {
  name      = "allerion-alerts"
  schedule  = var.alert_schedule
  time_zone = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.allerion.uri}/api/alerts/check"
    headers = {
      "Content-Type" = "application/json"
    }
    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}
