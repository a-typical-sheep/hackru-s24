output "status_page_url" {
  value       = "https://${var.status_page_subdomain}.betteruptime.com"
  description = "status page"
}

output "monitor_id" {
  value       = betteruptime_monitor.this.id
  description = "monitor id"
}