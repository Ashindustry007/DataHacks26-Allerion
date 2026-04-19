variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "google_pollen_api_key" {
  description = "Google Pollen API key"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Gemini API key"
  type        = string
  sensitive   = true
}

variable "gemini_model" {
  description = "Gemini model ID"
  type        = string
  default     = "gemini-2.5-flash"
}

variable "inat_app_id" {
  description = "Optional iNaturalist OAuth app ID"
  type        = string
  default     = ""
}

variable "image_tag" {
  description = "Docker image tag (set by deploy.sh)"
  type        = string
  default     = "latest"
}

variable "ingest_schedule" {
  description = "Cron schedule for iNat delta ingest (UTC)"
  type        = string
  default     = "0 */6 * * *"
}

variable "alert_schedule" {
  description = "Cron schedule for alert evaluation (UTC)"
  type        = string
  default     = "30 5,11,17 * * *"
}

variable "ingest_regions_json" {
  description = "JSON body for /api/ingest/delta (default: San Diego bbox)"
  type        = string
  default     = <<-EOT
    {"regions":[{"name":"san_diego","swlat":32.5,"swlng":-117.3,"nelat":33.1,"nelng":-116.8}]}
  EOT
}
