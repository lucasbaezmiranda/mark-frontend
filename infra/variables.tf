variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "aws_account_id" {
  type        = string
  description = "AWS account ID (12 digits)"
  sensitive   = true
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate in us-east-1 for CloudFront"
  sensitive   = true
}
