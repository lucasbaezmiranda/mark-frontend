# Referencia de Infraestructura y CI/CD — MLOps API

Documento técnico para replicar la infraestructura cloud y el flujo de despliegue de este proyecto. El sistema expone una API de ML containerizada en AWS, con un frontend estático en un dominio propio.

---

## Stack tecnológico

### Backend / API
| Componente | Tecnología |
|---|---|
| Framework web | FastAPI |
| Adapter Lambda | Mangum |
| Runtime | Python 3.9 |
| Containerización | Docker (imagen base `public.ecr.aws/lambda/python:3.9`) |
| Dependencias clave | `fastapi`, `mangum`, `pandas`, `numpy`, `scikit-learn`, `xgboost`, `joblib`, `pydantic` |

### Frontend
| Componente | Tecnología |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| HTTP client | axios |
| Node.js (CI) | v20 |

### Infraestructura Cloud (AWS)
| Servicio | Uso |
|---|---|
| ECR | Registro de imágenes Docker |
| Lambda | Cómputo serverless para la API |
| API Gateway (REST) | Punto de entrada HTTP público |
| S3 | Hosting del frontend estático |
| CloudFront | CDN + HTTPS + dominio propio |
| EventBridge | Warmup periódico de Lambda |
| ACM | Certificado SSL para CloudFront |
| IAM | Roles y políticas para todos los servicios |
| CloudWatch | Logs de Lambda |

### IaC y CI/CD
| Componente | Tecnología |
|---|---|
| IaC | Terraform >= 5.0 (provider `hashicorp/aws ~> 5.0`) |
| CI/CD | GitHub Actions |
| Autenticación AWS en CI | OIDC (sin credenciales estáticas) |

---

## Arquitectura cloud

```
                         ┌──────────────────────────────────────────────┐
                         │                   AWS                        │
                         │                                              │
  Browser / cliente      │   ┌─────────────┐     ┌──────────────────┐  │
  ─────────────────── ───┼──▶│ API Gateway │────▶│     Lambda       │  │
                         │   │  REST API   │     │  (Docker image)  │  │
  EventBridge warmup ────┼──▶│  /prod/*    │     │  FastAPI+Mangum  │  │
  (cada 5 minutos)       │   └─────────────┘     └──────────────────┘  │
                         │                                ▲             │
                         │                               ECR            │
                         │                        (imagen Docker)       │
                         │                                              │
  Browser usuario        │   ┌─────────────┐     ┌──────────────────┐  │
  ─────────────────── ───┼──▶│ CloudFront  │────▶│       S3         │  │
  tasador.lukebm.com     │   │ (CDN+HTTPS) │     │ (static hosting) │  │
                         │   └─────────────┘     └──────────────────┘  │
                         └──────────────────────────────────────────────┘
```

---

## Infraestructura Terraform — detalle por archivo

### `provider.tf`
- Define el provider `hashicorp/aws ~> 5.0`
- Región leída desde variable `var.aws_region` (default `us-east-1`)

### `ecr.tf`
- Crea el repositorio ECR `meli-api-repo`
- `image_tag_mutability = "MUTABLE"` (permite sobreescribir el tag `latest`)
- `scan_on_push = true` — escaneo de vulnerabilidades automático
- `force_delete = true` — permite destruir el repo aunque tenga imágenes
- Output: `repository_url`

### `lambda.tf`
Crea y conecta estos recursos en orden:

1. **IAM Role** (`meli_api_lambda_role`) con trust policy para `lambda.amazonaws.com`
2. **Policy attachment**: `AWSLambdaBasicExecutionRole` (permisos de CloudWatch Logs)
3. **Lambda function** (`meli-api-lambda`):
   - `package_type = "Image"` — corre desde imagen Docker en ECR
   - `image_uri`: `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/meli-api-repo:latest`
   - `memory_size = 3008` MB (maximiza CPU asignado para carga rápida del modelo)
   - `timeout = 180` segundos
4. **API Gateway REST API** (`MeliPriceApi`)
5. **Resource** con path `{proxy+}` — enruta todo bajo la raíz
6. **Method ANY** sin autorización → integración `AWS_PROXY` con Lambda
7. **CORS**: método OPTIONS separado con integración MOCK, headers `Access-Control-Allow-*`
8. **Deployment** en stage `prod`
9. **Lambda permission** para que API Gateway pueda invocar la función
10. Output: `api_url` → `<invoke_url>/predict`

> **Nota**: el CMD del Dockerfile debe apuntar al handler de Mangum (`main.handler`). La imagen base de Lambda ya define el ENTRYPOINT.

### `s3_front.tf`
1. **Bucket S3** (`meli-frontend-luke-2026`) — nombre único global
2. **Website configuration**: `index_document = index.html`, `error_document = index.html` (necesario para SPAs con client-side routing)
3. **Public access block**: desactivado (obligatorio para hosting estático público directo)
4. **Bucket policy**: `s3:GetObject` público para `*`
5. **CloudFront distribution**:
   - Origin: `bucket_regional_domain_name` del S3
   - `aliases`: dominio propio (ej. `tasador.lukebm.com`)
   - `viewer_protocol_policy = "redirect-to-https"`
   - Certificado ACM en `us-east-1` (requisito de CloudFront independientemente de la región del bucket)
   - TTL default: 3600s
   - Sin restricciones geográficas
6. Outputs: `s3_website_url`, `cloudfront_dns_name`

> **Prerequisito manual**: el registro DNS (alias A en Route 53 u otro proveedor) apuntando el subdominio al `cloudfront_dns_name` del output debe configurarse fuera de Terraform, o agregar el provider de Route 53.

### `warmup.tf`
Solución para evitar cold starts en Lambda:

1. **EventBridge Connection** con autenticación `API_KEY` (header `x-warmup: active`)
2. **API Destination** apuntando a `<invoke_url>/predict` con `http_method = POST` y rate limit 1 req/s
3. **EventBridge Rule**: `rate(5 minutes)`, estado `ENABLED`
4. **Target**: vincula la regla con el API Destination, inyecta un JSON de ejemplo como body del POST
5. **IAM Role** para EventBridge con permiso `events:InvokeApiDestination`

### `variables.tf`
| Variable | Tipo | Sensible | Descripción |
|---|---|---|---|
| `aws_region` | string | No | Región AWS, default `us-east-1` |
| `aws_account_id` | string | Sí | ID de 12 dígitos de la cuenta |
| `acm_certificate_arn` | string | Sí | ARN del certificado en ACM |

Los valores reales van en `terraform.tfvars` (en `.gitignore`). El repo incluye `terraform.tfvars.example` como plantilla.

---

## Flujo CI/CD

Hay dos pipelines independientes en `.github/workflows/`, cada uno activado solo cuando cambian los archivos de su dominio.

### Pipeline Backend (`backend.yml`)

**Trigger**: push a `main` con cambios en `api_inmuebles/**` o `.github/workflows/backend.yml`

```
push → main
    │
    ▼
[actions/checkout@v4]
    │
    ▼
[aws-actions/configure-aws-credentials@v4]
  → OIDC: asume rol vía secret AWS_ROLE_ARN
  → Región: us-east-1
    │
    ▼
[aws-actions/amazon-ecr-login@v2]
  → Obtiene registry URL y credenciales Docker
    │
    ▼
[docker/setup-buildx-action@v3]
    │
    ▼
[docker/build-push-action@v5]
  → context: ./api_inmuebles
  → push: true
  → tag: <registry>/meli-api-repo:latest
  → platforms: linux/amd64   ← crítico para Lambda
  → provenance: false         ← evita metadatos incompatibles con Lambda
  → format: docker            ← fuerza formato que AWS entiende
    │
    ▼
[aws lambda update-function-code]
  → --function-name meli-api-lambda
  → --image-uri <registry>/meli-api-repo:latest
```

**Secrets requeridos en el repo**:
- `AWS_ROLE_ARN` — ARN del IAM Role que el runner asume vía OIDC

**Configuración OIDC necesaria en AWS** (una vez, fuera de Terraform):
- Crear Identity Provider en IAM: `token.actions.githubusercontent.com`
- IAM Role con trust policy que permita asumir desde el repo específico
- Permisos del role: `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`, `lambda:UpdateFunctionCode`

---

### Pipeline Frontend (`frontend.yml`)

**Trigger**: push a `main` con cambios en `front/meli-frontend/**` o `.github/workflows/frontend.yml`

```
push → main
    │
    ▼
[actions/checkout@v4]
    │
    ▼
[aws-actions/configure-aws-credentials@v4]
  → OIDC: mismo mecanismo que backend
    │
    ▼
[actions/setup-node@v4]
  → node-version: '20'
    │
    ▼
cd front/meli-frontend && npm install && npm run build
  → genera ./dist/
    │
    ▼
aws s3 sync front/meli-frontend/dist/ s3://<BUCKET_NAME> --delete
  → sube solo los archivos nuevos/modificados
  → --delete elimina archivos obsoletos del bucket
    │
    ▼
aws cloudfront create-invalidation
  → --distribution-id <secret>
  → --paths "/*"
  → fuerza re-fetch desde S3 en todos los edge locations
```

**Secrets requeridos en el repo**:
- `AWS_ROLE_ARN` — mismo role o uno específico con permisos S3 + CloudFront
- `CLOUDFRONT_DISTRIBUTION_ID` — ID de la distribución (obtenible del output de Terraform)

**Permisos adicionales del IAM Role para frontend**: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `cloudfront:CreateInvalidation`

---

## Estructura de directorios relevante

```
desafio_mlops_meli/
├── api_inmuebles/           # Backend: código Python + artefacto del modelo
│   ├── Dockerfile
│   ├── main.py              # FastAPI app + Mangum handler
│   ├── requirements.txt
│   └── model/
│       └── *.joblib         # Artefacto del modelo serializado
├── front/
│   └── meli-frontend/       # SPA React + Vite
│       ├── src/
│       ├── package.json
│       └── vite.config.js
├── infra/                   # Terraform IaC
│   ├── provider.tf
│   ├── ecr.tf
│   ├── lambda.tf
│   ├── s3_front.tf
│   ├── warmup.tf
│   ├── variables.tf
│   ├── terraform.tfvars.example   # Plantilla (tfvars real está en .gitignore)
│   └── .terraform.lock.hcl
├── monitor/
│   └── docker-compose.yml   # Grafana para dashboards locales/remotos
├── data/                    # Notebooks y dataset (no va a producción)
│   └── notebooks/
└── .github/
    └── workflows/
        ├── backend.yml
        └── frontend.yml
```

---

## Decisiones de diseño relevantes para DevOps

| Decisión | Motivo |
|---|---|
| Lambda con imagen Docker en lugar de ZIP | El modelo ML con sus dependencias (sklearn, xgboost, pandas) supera el límite de 250 MB de un ZIP |
| Imagen base `public.ecr.aws/lambda/python:3.9` | Evita errores de ENTRYPOINT; la imagen ya está configurada para el runtime de Lambda |
| `platforms: linux/amd64` en build | Lambda corre exclusivamente en `x86_64`; sin esta flag el build en Mac (ARM) generaría una imagen incompatible |
| `provenance: false` + `format: docker` en build | BuildKit por defecto genera manifests multi-arquitectura que Lambda no puede leer |
| `memory_size = 3008` MB en Lambda | AWS asigna CPU proporcional a memoria; más memoria = más vCPUs = carga de modelo más rápida |
| EventBridge warmup cada 5 minutos | Lambda con imagen Docker tiene cold starts de varios segundos; el warmup mantiene al menos una instancia caliente |
| CORS en dos capas (FastAPI middleware + API Gateway) | El middleware de FastAPI cubre las respuestas 200; API Gateway cubre el preflight OPTIONS antes de llegar a Lambda |
| OIDC en lugar de `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales temporales sin secretos long-lived en el repo; sigue las mejores prácticas de seguridad AWS |
| `--delete` en `s3 sync` | Elimina del bucket los archivos que ya no existen en el build (evita acumular assets viejos) |
| Invalidación de CloudFront post-deploy | Sin esto, los edge locations sirven el bundle anterior hasta que expira el TTL (hasta 24h) |

---

## Checklist de despliegue inicial

### AWS (una vez, manual)
- [ ] Crear OIDC Identity Provider en IAM (`token.actions.githubusercontent.com`)
- [ ] Crear IAM Role con trust policy para el repo de GitHub + permisos de ECR, Lambda, S3 y CloudFront
- [ ] Solicitar o importar certificado SSL en **ACM región us-east-1** para el dominio (requerido por CloudFront)
- [ ] Anotar el ARN del certificado

### Terraform
- [ ] Copiar `terraform.tfvars.example` → `terraform.tfvars` y completar con valores reales
- [ ] `terraform init`
- [ ] `terraform plan`
- [ ] `terraform apply`
- [ ] Anotar los outputs: `api_url`, `repository_url`, `cloudfront_dns_name`

### DNS
- [ ] Crear registro alias A en Route 53 (u otro proveedor) apuntando el subdominio al `cloudfront_dns_name`

### GitHub Secrets
- [ ] Configurar `AWS_ROLE_ARN`
- [ ] Configurar `CLOUDFRONT_DISTRIBUTION_ID` (obtenido de la consola o del state de Terraform)

### Primera imagen Docker
- [ ] Build y push manual inicial (o hacer un push vacío a `main` con cambios en `api_inmuebles/` para disparar el CI)

### Verificación
- [ ] `GET <api_url>/` devuelve `{"status": "ok"}`
- [ ] `POST <api_url>/predict` con payload de prueba devuelve predicción
- [ ] Frontend en el dominio propio carga y conecta con la API
- [ ] Logs de Lambda visibles en CloudWatch
- [ ] EventBridge warmup aparece en logs cada 5 minutos
