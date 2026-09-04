# Email Scheduler

A full-stack email scheduling and queue management application. It lets users schedule single or bulk emails for future delivery, view email history, search through sent/scheduled emails, monitor queue stats, and receive Slack alerts when emails are delivered or fail.

---

## Overview

This project handles email scheduling using a background worker pattern rather than client-side timers or simple crons. The backend uses Express and BullMQ (backed by Redis) to manage delayed jobs, rate limits, and retries. MySQL serves as the main database, while Elasticsearch indexes emails for fast search.

### Tech Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
* **Backend**: Node.js, Express, TypeScript
* **Database**: MySQL 8
* **Queue & Caching**: Redis 7, BullMQ 5
* **Email Service**: Ethereal SMTP (Nodemailer for testing)
* **Search Index**: Elasticsearch 8.11 (with MySQL fallback)
* **Auth**: Google OAuth 2.0 & JWT tokens
* **Integrations**: Slack OAuth & Webhook notifications
* **Queue Monitor**: Bull-Board 9
* **Containerization**: Docker & Docker Compose

---

## Architecture

```
Frontend (React + Vite)
      │
      ▼ (HTTP / REST API with JWT)
Express API Server (Node.js + TS)
      │
      ├───────────────────────┼────────────────────────┐
      ▼                       ▼                        ▼
MySQL Database         Redis / BullMQ             Elasticsearch 8.11
(Main Source of Truth) (Delayed Job Queue)        (Search Index)
                              │
                              ▼
                        BullMQ Worker
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Ethereal SMTP Mail             Slack Webhook / Bot
```

### Component Roles

* **React Frontend**: Main user interface with pages for Dashboard, Schedule Email, CSV Upload, Email History, Search, and Settings.
* **Express API Server**: Validates request data, handles JWT/OAuth auth, manages MySQL records, adds delayed jobs to BullMQ, and queries Elasticsearch.
* **MySQL**: Stores persistent records for emails, users, and Slack integration tokens.
* **Redis & BullMQ**: Manages delayed execution timers, idempotency locks (`idempotency:email:*`), rate-limiting counters (`ratelimit:email:*`), and runtime configuration (`scheduler:config`).
* **BullMQ Worker**: Picks up ready jobs, checks Redis rate limits, sends emails via Ethereal SMTP, updates MySQL/Elasticsearch statuses, and triggers Slack notifications.
* **Ethereal SMTP**: Captures sent test emails and provides web preview links so real emails aren't spammed.
* **Elasticsearch**: Enables full-text search across email subjects, bodies, and recipients (falls back to MySQL if Elasticsearch is down).
* **Bull-Board**: Provides a live visual dashboard at `/admin/queues` to inspect waiting, active, completed, and failed queue jobs.

---

## Features

* **Google Sign-In**: Login with Google OAuth to get a JWT token.
* **Single Email Scheduling**: Pick a date and time in the future to send an email.
* **CSV Bulk Upload**: Upload a CSV file with multiple emails, preview rows, and schedule valid ones in bulk.
* **BullMQ Delayed Queue**: Jobs sit in Redis until their scheduled time arrives.
* **Dynamic Worker Settings**: Adjust worker concurrency, artificial delays, and hourly rate limits live from the Settings page.
* **Hourly Rate Limiting**: If the hourly email limit is hit, extra jobs are delayed to the next window without blocking threads.
* **Retries & Exponential Backoff**: Failed sends retry up to 3 times with exponential backoff before marking as `FAILED`.
* **Idempotency**: Prevents double-sending the same email if a job retries or if duplicate requests are made.
* **Server Crash Recovery**: On startup, the backend automatically resets any stuck `PROCESSING` jobs back to `QUEUED`.
* **Full-Text Search**: Search through scheduled and sent emails by subject, body, recipient, or status.
* **Slack Alerts**: Connect Slack to receive notifications when an email sends or permanently fails.
* **Email History & Inspection**: Table view of all scheduled emails with an inspection modal showing attempts, timestamps, and error logs.
* **Dashboard Stats**: Real metrics pulled from MySQL counts and live BullMQ job counters.

---

## Project Structure

```
reachinbox-email-scheduler/
├── docker-compose.yml              # Docker Compose setup for all 5 services
├── README.md                       # Documentation
├── database/
│   └── reachinbox.sql              # Initial MySQL database schema
├── backend/
│   ├── Dockerfile                  # Multi-stage Dockerfile for Express backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── app.ts                  # Server setup and entry point
│       ├── config/                 # Environment, DB, Redis config
│       ├── controllers/            # Route controllers (email, search, auth, stats, config)
│       ├── middleware/             # Error handling and JWT auth middleware
│       ├── models/                 # MySQL database models
│       ├── queues/                 # BullMQ queue setup
│       ├── routes/                 # Express API routes
│       ├── services/               # Services for email, SMTP, Elasticsearch, Slack
│       ├── types/                  # TypeScript types
│       ├── utils/                  # API response helpers
│       └── workers/                # BullMQ email worker code
└── frontend/
    ├── Dockerfile                  # Dockerfile for React build + Nginx
    ├── nginx.conf                  # Nginx web server config for SPA
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx                 # App layout and route definitions
        ├── components/             # Reusable UI components (Toasts, Skeletons, Empty States)
        ├── context/                # AuthContext and ToastContext
        ├── pages/                  # Page components (Dashboard, Schedule, History, Search, etc.)
        ├── services/               # API fetch utilities
        └── types/                  # Frontend TypeScript types
```

---

## Prerequisites

Make sure you have the following installed locally:

* **Node.js** (v18 or higher)
* **npm** (v9 or higher)
* **Docker & Docker Compose** (Recommended if you want to run everything in containers)
* **MySQL 8** (If running locally without Docker)
* **Redis 7** (If running locally without Docker)
* **Elasticsearch 8.11** (Optional for search; MySQL fallback works automatically if offline)
* **Google OAuth Credentials** (For Google login)
* **Slack App Credentials** (For Slack integration)

---

## Environment Variables

Copy `.env.example` to `.env` in both `backend` and `frontend` folders before running.

### Backend (`backend/.env`)

```env
PORT=5000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=reachinbox
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password

REDIS_HOST=localhost
REDIS_PORT=6379

WORKER_CONCURRENCY=5
WORKER_ARTIFICIAL_DELAY_MS=0
EMAIL_JOB_ATTEMPTS=3
EMAIL_JOB_BACKOFF_DELAY=1000
EMAIL_HOURLY_LIMIT=100

ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=emails

JWT_SECRET=your_jwt_secret_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/auth/slack/callback
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Installation

### 1. Clone the repo
```bash
git clone https://github.com/taiyyaba-106/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
```

### 2. Install backend dependencies
```bash
cd backend
npm install
cp .env.example .env
cd ..
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cp .env.example .env
cd ..
```

---

## Database Setup

The backend auto-initializes the required database tables (`scheduled_emails`, `users`, `slack_integrations`) on startup using `initDatabase()` and `initUserModel()`.

If you prefer initializing manually in MySQL:
```bash
mysql -u root -p reachinbox < database/reachinbox.sql
```

---

## Running the Application

### Method 1: Using Docker Compose (Quickest)

This spins up all 5 containers (**MySQL**, **Redis**, **Elasticsearch**, **Backend**, and **Frontend**):

```bash
docker compose up --build -d
```

* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000/api/health`
* **Queue Dashboard**: `http://localhost:5000/admin/queues`

To stop the containers:
```bash
docker compose down
```

---

### Method 2: Running Locally

Ensure local MySQL, Redis, and Elasticsearch services are started first.

#### Start Backend:
```bash
cd backend
npm run dev
```

#### Start Frontend:
```bash
cd frontend
npm run dev
```

---

## Testing & Builds

### Backend Build
```bash
cd backend
npm run build
```

### Frontend Build
```bash
cd frontend
npm run build
```

---

## API Endpoints

### Authentication
* `GET /api/auth/google` — Redirects to Google login
* `GET /api/auth/google/callback` — Google OAuth callback (returns JWT token)
* `GET /api/auth/me` — Returns current logged-in user info

### Emails
* `POST /api/emails/schedule` — Schedules a single email
* `POST /api/emails/schedule/bulk` — Schedules multiple emails from CSV
* `GET /api/emails` — Gets paginated email list (`page`, `limit`, `status`)
* `GET /api/emails/:id` — Gets detailed email record by ID

### Search & Dashboard
* `GET /api/emails/search` — Search emails by query string, status, recipient
* `GET /api/dashboard/stats` — Gets total email counts, success rates, and live queue numbers

### Settings & Integrations
* `GET /api/config` — Fetches current Redis worker/rate-limit settings
* `PUT /api/config` — Updates worker concurrency, hourly limits live in Redis
* `GET /api/auth/slack` — Initiates Slack OAuth connection
* `GET /api/integrations/slack/status` — Checks if Slack is connected

### Queue Administration
* `GET /admin/queues` — Opens Bull-Board dashboard UI to inspect queue jobs

---

## Scheduling Flow

Here is how an email travels through the system:

1. User submits the schedule form on the frontend with a future `scheduledAt` date.
2. Express validates inputs and saves an entry into MySQL with status `PENDING`.
3. The server calculates `delay = scheduledAt - Date.now()` and adds a delayed job to BullMQ.
4. The MySQL status updates to `QUEUED`.
5. BullMQ holds the job inside Redis until the scheduled time.
6. When the timer expires, the worker picks up the job and acquires an atomic Redis lock.
7. The worker checks the hourly rate limit. If allowed, it sends the email via Ethereal SMTP (Nodemailer). If the rate limit is hit, it reschedules the job for the next hour.
8. Upon successful send, MySQL status updates to `SENT`, storing the message ID.
9. Elasticsearch document is updated with the new status.
10. If Slack is connected, a notification is posted to your channel.

---

## Reliability Features

* **Exponential Backoff**: Retries failed sends up to 3 times, waiting longer between each retry.
* **Idempotency Locks**: Redis locks (`idempotency:email:<id>`) ensure an email job isn't processed twice by accident.
* **Crash Recovery**: If the server crashes mid-job, restarting it resets any orphaned `PROCESSING` jobs back to `QUEUED`.
* **No Thread Blocking**: Rate-limited jobs are rescheduled back into BullMQ instead of using `setInterval` or blocking node event loops.

---

## Security

* **Environment Secrets**: Sensitive API keys and passwords are standard `.env` variables and excluded via `.gitignore`.
* **JWT Tokens**: Protected API routes check Bearer tokens in headers.
* **User Isolation**: Emails are linked to `user_id` so users only see their own scheduled records.
* **Input Validation**: Strict format checks for emails, dates, and CSV limits.

---

## Troubleshooting

* **Redis connection error (`ECONNREFUSED 127.0.0.1:6379`)**: Make sure Redis server or container is running.
* **MySQL Connection Refused / Invalid Credentials**: Check database credentials in `backend/.env`.
* **Elasticsearch Connection Error**: The app will automatically fall back to MySQL search if Elasticsearch isn't reachable.
* **Google OAuth Error**: Double check your redirect URI `http://localhost:5000/api/auth/google/callback` matches Google Cloud Console settings.

---

## Quick Demo Walkthrough

1. Go to `http://localhost:5173/schedule`.
2. Enter a test recipient (e.g. `test@ethereal.email`), subject, body, and pick a time **2 minutes in the future**.
3. Hit **Schedule Email**.
4. Open `http://localhost:5000/admin/queues` to see your job waiting in the BullMQ **Delayed** tab.
5. Wait 2 minutes for execution, then check `http://localhost:5173/emails` to see status change to **SENT** with an Ethereal mail preview link!
