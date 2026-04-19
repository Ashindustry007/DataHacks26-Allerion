output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.allerion.uri
}

output "image_url" {
  description = "Container image pushed to Artifact Registry"
  value       = local.image_url
}

output "service_account" {
  description = "Cloud Run service account email"
  value       = google_service_account.allerion.email
}
