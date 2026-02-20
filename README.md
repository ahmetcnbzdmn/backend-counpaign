# Counpaign Backend

This repository contains the Node.js/Express backend for the Counpaign application. It is containerized using Docker and deployed via GitHub Actions to an AWS EC2 instance.

## 🚀 Architecture Overview

- **Runtime**: Node.js 20 (Alpine Linux)
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (Handles SSL, Gzip, Rate Limiting)
- **Database**: MongoDB Atlas
- **CI/CD**: GitHub Actions -> EC2 (SSH)
- **Security**: Let's Encrypt SSL, Helmet, CORS, Rate Limiting

## 🛠️ Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Node.js 20+ (for local development without Docker)

## 💻 Local Development (Docker)

To run the entire stack (Backend + Nginx) locally:

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd backend-counpaign
   ```

2. **Configure Environment:**
   Copy `.env.example` (or create `.env`) with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_dev_secret
   NODE_ENV=development
   # ... other keys
   ```

3. **Start Containers:**
   ```bash
   docker compose up --build
   ```
   - **Backend API**: `http://localhost:5000`
   - **Nginx Proxy**: `http://localhost:80`
   - **Health Check**: `http://localhost:5000/api/health`

## 🌍 Deployment (Production)

Deployment is automated via **GitHub Actions**.

### Workflow (`.github/workflows/deploy.yml`)
Every push to the `main` branch triggers:
1. **Linting**: Checks code quality.
2. **Docker Build**: Builds the production image.
3. **Deploy**: SSH into EC2, pulls changes, and restarts containers.

### Required GitHub Secrets
- `EC2_HOST`: Server IP (e.g., 16.16.255.118)
- `EC2_USER`: SSH User (ubuntu)
- `EC2_SSH_KEY`: Private SSH Key (.pem content)
- `ENV_FILE`: Full content of the production `.env` file
- `FIREBASE_KEY`: Full content of `serviceAccountKey.json`

## 🔒 Security Features

- **SSL/HTTPS**: Automated via Let's Encrypt & Certbot (auto-renewal enabled).
- **Rate Limiting**: 
  - Production: 200 requests / 15 mins
  - Development: 5000 requests / 15 mins
- **CORS**: Whitelisted to `counpaign.com` and admin panel in production.
- **Headers**: Secure HTTP headers via `helmet`.
- **Logs**: Sensitive request bodies are **not** logged in production.

## 📂 Project Structure

```
backend-counpaign/
├── .github/workflows/   # CI/CD pipelines
├── nginx/              
│   ├── nginx.conf       # Reverse proxy config
│   └── init-ssl.sh      # SSL generation script
├── scripts/             # Utility scripts (backup, etc.)
├── src/                 # Application source code
│   ├── app.js           # Express app setup
│   ├── server.js        # Server entry point
│   ├── routes/          # API routes
│   └── utils/           # Helpers (logger, etc.)
├── Dockerfile           # Multi-stage build definition
├── docker-compose.yml   # Service orchestration
└── deploy-docker.sh     # Manual deployment script (fallback)
```

## 📦 Backups

MongoDB backups are automated via `scripts/backup-mongo.sh`.
- Runs daily via cron (check `crontab -l` on server).
- Retains backups for 7 days.
