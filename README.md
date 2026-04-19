# CarGuru Backend

Node.js + TypeScript backend for the CarGuru application, providing car recommendation APIs and PostgreSQL integration.

## 🚀 Setup & Installation

### 1. Prerequisites

- Node.js 20+
- PostgreSQL (or use Docker)

### 2. Environment Variables

Create a `.env` file in the root of the `carguru-backend` directory:

```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=carguru
DB_USER=your_user
DB_PASSWORD=your_password
CORS_ORIGINS=http://localhost:3000
```

### 3. Local Development

```bash
# Install dependencies
npm install

# Run migration/seed (make sure DB is running and reachable)
node scripts/seed.js

# Run in development mode
npm run dev
```

### 4. Docker Usage

From the root `carguru` directory, you can start the backend services:

```bash
# Start backend and database
docker compose up -d backend postgres
```

## 📂 Project Structure

- `/src`: Application source code (Express, Controllers, Services).
- `/scripts`: Database initialization and seeding scripts.
- `cars_dataset.json`: Initial data for car recommendations.

## 📡 API Endpoints

- `GET /health`: Server health check.
- `GET /api/analytics/stats`: Get overview statistics for the homepage.
- `GET /api/analytics/popular`: Get trending cars.
- `POST /api/recommendations`: Get AI-powered car recommendations.
