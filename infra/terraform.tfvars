project_id            = "ece143-489600"
region                = "us-central1"
google_pollen_api_key = "AIzaSyAwZqzxRvrz3yngJU-aD8KA8Kgd1JtjI9M"
gemini_api_key        = "AIzaSyCi_Yz95TC5ABWnj4dV92oQ7Fu3UvQgUtc"
gemini_model          = "gemini-2.5-flash"
inat_app_id           = ""

# Cron: ingest iNat observations every 6 hours
ingest_schedule = "0 */6 * * *"

# Cron: evaluate alerts 3x daily (5:30, 11:30, 17:30 UTC)
alert_schedule = "30 5,11,17 * * *"

# Bounding box regions for iNat delta ingestion
ingest_regions_json = <<-EOT
  {"regions":[{"name":"san_diego","swlat":32.5,"swlng":-117.3,"nelat":33.1,"nelng":-116.8}]}
EOT
