terraform {
  required_version = ">= 0.14"
  required_providers {
    betteruptime = {
      source  = "BetterStackHQ/better-uptime"
      version = ">= 0.9.3"
    }
  }
}

provider "betteruptime" {
  api_token = var.betteruptime_api_token
}