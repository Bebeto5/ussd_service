# USSD service

A simple USSD pass-through service built with Node.js + Express, documented with Swagger/OpenAPI, and deployed via GitHub Actions.

## Quick start (local)

```bash
npm install
npm run dev
# App:        http://localhost:3000
# Swagger UI: http://localhost:3000/api-docs
# Health:     http://localhost:3000/health
```

Or with Docker Compose:

```bash
docker compose up
```

## Test the endpoint manually

```bash
# Simulate a fresh session (user dials *123#)
curl -X POST http://localhost:3000/ussd \
  -d "sessionId=test-001&serviceCode=*123%23&phoneNumber=%2B233241234567&ussdString="

# User selects option 1 (check balance)
curl -X POST http://localhost:3000/ussd \
  -d "sessionId=test-001&serviceCode=*123%23&phoneNumber=%2B233241234567&ussdString=1"

# User selects option 2 then enters amount
curl -X POST http://localhost:3000/ussd \
  -d "sessionId=test-001&serviceCode=*123%23&phoneNumber=%2B233241234567&ussdString=2*10"
```

## Run tests

```bash
npm test
```

## Project structure

```
ussd-service/
├── .github/
│   └── workflows/
│       └── deploy.yml        GitHub Actions CI/CD pipeline
├── app.js                    Express server + USSD handler
├── app.test.js               Jest tests
├── openapi.yaml              Swagger/OpenAPI 3.0 spec
├── Dockerfile
├── docker-compose.yml        Local dev with Postgres
└── package.json
```

## GitHub Secrets required

Set these in your repo under Settings → Secrets → Actions:

| Secret | Description |
|---|---|
| `SERVER_HOST` | IP or hostname of your production server |
| `SERVER_USER` | SSH username (e.g. `ubuntu`) |
| `SERVER_SSH_KEY` | Private SSH key for server access |
| `DATABASE_URL` | Production Postgres connection string |
| `SLACK_WEBHOOK_URL` | (Optional) Slack webhook for deploy alerts |

`GITHUB_TOKEN` is provided automatically by GitHub Actions for GHCR access.

## CI/CD pipeline

Every push to `main`:
1. Lint + run Jest tests
2. Validate `openapi.yaml` with Spectral
3. Build Docker image and push to GHCR
4. SSH into server, pull image, restart container
5. Health check — auto-rollback to previous image on failure

Pull requests run steps 1–2 only (no deploy).

## USSD response format

Your app must respond within **3 seconds**. Response body starts with:
- `CON ` — session continues, user sees the text as a menu
- `END ` — session closes, user sees the final message

Use `\n` to separate menu lines on the handset.
