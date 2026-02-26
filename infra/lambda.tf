# ── IAM Role ──────────────────────────────────────────────────────────────────
resource "aws_iam_role" "markowitz_lambda_role" {
  name = "markowitz_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.markowitz_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "markowitz_lambda_s3_policy"
  role = aws_iam_role.markowitz_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "arn:aws:s3:::lukebm-plot-bucket/*"
      },
      {
        Effect   = "Allow"
        Action   = "dynamodb:Query"
        Resource = "arn:aws:dynamodb:us-east-1:${var.aws_account_id}:table/stock_prices"
      }
    ]
  })
}

# ── Lambda dummy ZIP (replaced by CI on first deploy) ─────────────────────────
data "archive_file" "lambda_dummy" {
  type        = "zip"
  output_path = "${path.module}/lambda_dummy.zip"

  source {
    content  = "def lambda_handler(event, context): return {'statusCode': 200, 'body': 'placeholder'}"
    filename = "app.py"
  }
}

# ── Lambda Function ───────────────────────────────────────────────────────────
resource "aws_lambda_function" "markowitz" {
  function_name = "markowitz-lambda"
  role          = aws_iam_role.markowitz_lambda_role.arn
  runtime       = "python3.12"
  handler       = "app.lambda_handler"
  package_type  = "Zip"
  filename      = data.archive_file.lambda_dummy.output_path
  memory_size   = 512
  timeout       = 60

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ── API Gateway REST API ───────────────────────────────────────────────────────
resource "aws_api_gateway_rest_api" "markowitz_api" {
  name = "MarkowitzApi"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.markowitz_api.id
  parent_id   = aws_api_gateway_rest_api.markowitz_api.root_resource_id
  path_part   = "{proxy+}"
}

# ── ANY method → Lambda proxy ─────────────────────────────────────────────────
resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.markowitz_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.markowitz_api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.markowitz.invoke_arn
}

# ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────
resource "aws_api_gateway_method" "proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.markowitz_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_options_mock" {
  rest_api_id = aws_api_gateway_rest_api.markowitz_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "proxy_options_200" {
  rest_api_id = aws_api_gateway_rest_api.markowitz_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "proxy_options_response" {
  rest_api_id = aws_api_gateway_rest_api.markowitz_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = aws_api_gateway_method_response.proxy_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://frontier.lukebm.com'"
  }
}

# ── Deployment ────────────────────────────────────────────────────────────────
resource "aws_api_gateway_deployment" "prod" {
  rest_api_id = aws_api_gateway_rest_api.markowitz_api.id

  depends_on = [
    aws_api_gateway_integration.proxy_lambda,
    aws_api_gateway_integration.proxy_options_mock,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.markowitz_api.id
  deployment_id = aws_api_gateway_deployment.prod.id
  stage_name    = "prod"
}

# ── Lambda permission for API Gateway ─────────────────────────────────────────
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.markowitz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.markowitz_api.execution_arn}/*/*"
}

# ── Output ────────────────────────────────────────────────────────────────────
output "api_url" {
  value       = aws_api_gateway_stage.prod.invoke_url
  description = "API Gateway invoke URL (stage: prod)"
}
