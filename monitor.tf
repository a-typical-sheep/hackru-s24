resource "betteruptime_status_page" "this" {
  company_name = var.company_name
  company_url  = var.company_url
  timezone     = var.timezone
  subdomain    = var.status_page_subdomain
}

resource "betteruptime_monitor" "this" {
  url          = var.llm_endpoint_url
  monitor_type = "status"
  call         = false
  sms          = false
  email        = true
}

resource "betteruptime_status_page_resource" "monitor" {
  status_page_id = betteruptime_status_page.this.id
  resource_id    = betteruptime_monitor.this.id
  resource_type  = "Monitor"
  public_name    = "LLM API"
}
