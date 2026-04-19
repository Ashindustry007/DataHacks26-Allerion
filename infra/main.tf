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

# --------------------------------------------------------------------------
# Enable required GCP APIs
# --------------------------------------------------------------------------

locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "firestore.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudbuild.googleapis.com",
    "fcm.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# --------------------------------------------------------------------------
# Artifact Registry — Docker repo for the container image
# --------------------------------------------------------------------------

resource "google_artifact_registry_repository" "pollencast" {
  location      = var.region
  repository_id = "pollencast"
  format        = "DOCKER"

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

locals {
  image_url = "${var.region}-docker.pkg.dev/${var.project_id}/pollencast/backend:${var.image_tag}"
}

# --------------------------------------------------------------------------
# Service account for Cloud Run
# --------------------------------------------------------------------------

resource "google_service_account" "pollencast" {
  account_id   = "pollencast-run"
  display_name = "PollenCast Cloud Run"
}

resource "google_project_iam_member" "firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.pollencast.email}"
}

resource "google_project_iam_member" "fcm" {
  project = var.project_id
  role    = "roles/firebasecloudmessaging.admin"
  member  = "serviceAccount:${google_service_account.pollencast.email}"
}

# --------------------------------------------------------------------------
# Firestore database (native mode)
# --------------------------------------------------------------------------

resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis["firestore.googleapis.com"]]

  lifecycle {
    ignore_changes = [location_id, type]
  }
}

# --------------------------------------------------------------------------
# Cloud Run service
# --------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "pollencast" {
  name     = "pollencast"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.pollencast.email

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

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_artifact_registry_repository.pollencast,
  ]
}

# Allow unauthenticated access (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.pollencast.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --------------------------------------------------------------------------
# Cloud Scheduler — periodic jobs
# --------------------------------------------------------------------------

resource "google_service_account" "scheduler" {
  account_id   = "pollencast-scheduler"
  display_name = "PollenCast Scheduler"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoke" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.pollencast.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "ingest" {
  name      = "pollencast-ingest"
  schedule  = var.ingest_schedule
  time_zone = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.pollencast.uri}/api/ingest/delta"
    body        = base64encode(var.ingest_regions_json)
    headers = {
      "Content-Type" = "application/json"
    }
    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }

  depends_on = [google_project_service.apis["cloudscheduler.googleapis.com"]]
}

resource "google_cloud_scheduler_job" "alerts" {
  name      = "pollencast-alerts"
  schedule  = var.alert_schedule
  time_zone = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.pollencast.uri}/api/alerts/check"
    headers = {
      "Content-Type" = "application/json"
    }
    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }

  depends_on = [google_project_service.apis["cloudscheduler.googleapis.com"]]
}
