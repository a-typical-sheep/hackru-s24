variable "llm_endpoint_url" {
  description = "URL of the AWS-hosted LLM API"
  type        = string
  default     = "" #omitted
}

variable "betteruptime_api_token" {
  description = "BetterUptime API Token"
  type        = string
  default     = "" #omitted
}

variable "monitor_interval" {
  description = "Monitoring interval in seconds"
  type        = number
  default     = 60
}

variable "company_name" {
  description = "Company name for the status page"
  type        = string
  default     = "ResearchLLM"
}

variable "company_url" {
  description = "Company website URL"
  type        = string
  default     = "https://researchllm.com"
}

variable "status_page_subdomain" {
  description = "Subdomain for the BetterStack status page"
  type        = string
  default     = "ResearchLLM"
}

variable "timezone" {
  description = "Timezone for status page updates"
  type        = string
  default     = "EST"
}
