# ReachInbox Email Scheduler – Full-Stack Email Job Scheduler

Production-grade email scheduler service and real-time dashboard built for scale, reliability, and high throughput.

---

## 🚀 Live Application Links

* **Frontend Dashboard (Vercel)**: [https://reachinbox-email-scheduler-app.vercel.app](https://reachinbox-email-scheduler-app.vercel.app)
* **Backend API Service (Render)**: [https://reachinbox-email-scheduler-1-17a7.onrender.com](https://reachinbox-email-scheduler-1-17a7.onrender.com)
* **Live BullMQ Queue Dashboard**: [https://reachinbox-email-scheduler-1-17a7.onrender.com/admin/queues](https://reachinbox-email-scheduler-1-17a7.onrender.com/admin/queues)
* **GitHub Repository**: [https://github.com/taiyyaba-106/reachinbox-email-scheduler](https://github.com/taiyyaba-106/reachinbox-email-scheduler)

---

## 🛠 Tech Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons
* **Backend**: Node.js, Express.js, TypeScript
* **Queue Engine**: BullMQ 5 (backed by Redis 7) – **No Cron Jobs**
* **Database**: MySQL 8 (Railway Cloud Host)
* **SMTP Delivery**: Ethereal Email (Nodemailer for fake SMTP testing)
* **Search Engine**: Elasticsearch 8.11 (with automatic MySQL fallback)
* **Authentication**: Real Google OAuth 2.0 & signed JWT tokens
* **Integrations**: Slack OAuth 2.0 & Incoming Webhook notifications
* **Monitoring**: Bull-Board 9 (Visual queue dashboard at `/admin/queues`)
* **Deployment**: Vercel (Frontend), Render (Backend), Railway (MySQL Database)

---

## 🏗 Architecture & System Design

```
                     ┌─────────────────────────────────────────┐
                     │          React Frontend (Vite)          │
                     └────────────────────┬────────────────────┘
                                          │ HTTP / REST API (JWT)
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │         Express API Server (TS)         │
                     └───────┬────────────────┬─────────┬──────┘
                             │                │         │
                 ┌───────────▼───┐   ┌────────▼─────┐ ┌─▼─────────────────┐
                 │ Railway MySQL │   │ Redis /      │ │ Elasticsearch     │
                 │ Database      │   │ BullMQ Queue │ │ Search Engine     │
                 └───────────────┘   └────────┬─────┘ └───────────────────┘
                                              │
                                              ▼
                                     BullMQ Worker Loop
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                             Ethereal SMTP         Slack Webhook /
                              Mail Delivery          OAuth Bot
```

### Key Architectural Highlights

1. **No Cron Jobs**: Emails are scheduled using BullMQ delayed jobs (`emailQueue.add('send-email', payload, { delay })`). Jobs wait inside Redis until their scheduled timestamp arrives.
2. **Server Restart & Crash Recovery**: State is persisted in Railway MySQL and Redis. If the server or container restarts, future delayed jobs in BullMQ execute at their exact scheduled time without losing data or re-sending past emails. On startup, orphaned `PROCESSING` jobs are safely reset back to `QUEUED`.
3. **Multi-Layer Idempotency**: 3-layer protection (Redis key check, MySQL status check, atomic Redis processing lock `idempotency:email:<id>`) prevents duplicate delivery attempts even under heavy concurrency.
4. **Resilient Delivery Engine**: 4-second timeout race condition with guaranteed fallback dispatch ensures cloud SMTP network bottlenecks never cause stuck or lost jobs.

---

## ✨ Features & Requirements Compliance

### 1. Google OAuth 2.0 Authentication
* **Real Google Login**: OAuth 2.0 consent flow via Google Identity Servers.
* **Post-Login Redirect**: Automatically redirects authenticated users straight to the **Dashboard** (`/dashboard`).
* **Header User Profile**: Displays User's **Name**, **Email**, and **Avatar Picture** in the top navigation header.
* **Logout Option**: One-click sign-out clearing stored tokens.

### 2. Main Dashboard & Email Scheduling
* **Single Email Scheduling**: Pick a recipient, subject, body, and future start date/time.
* **CSV Bulk Upload**: Upload CSV lead files with automated validation, row preview, duplicate detection, and batch scheduling.
* **Scheduled & Sent Emails Tables**: Paginated tables with search, status filters (`PENDING`, `QUEUED`, `PROCESSING`, `SENT`, `FAILED`), loading indicators, and empty states.
* **Full-Text Search**: Instant search across subjects, bodies, and recipients powered by Elasticsearch with MySQL fallback.

### 3. Throughput, Rate Limiting & Concurrency
* **Worker Concurrency**: Configurable parallel BullMQ worker tasks (`WORKER_CONCURRENCY`, live-configurable via Settings page).
* **Minimum Throttling Delay**: Configurable minimum delay between individual email dispatches (`WORKER_ARTIFICIAL_DELAY_MS`) to mimic provider limits.
* **Hourly Rate Limiting**: Redis-backed sliding window counter (`EMAIL_HOURLY_LIMIT`). When the hourly limit is reached, jobs are automatically delayed into the next hour window without dropping jobs or blocking threads.
* **Real Slack OAuth & Webhook Integration**: Connect Slack via real **Slack OAuth 2.0** or **Incoming Webhook URL**. Receives real-time channel alerts when emails are sent, fail, or hit rate limits.

---

## 📂 Project Structure

```
reachinbox-email-scheduler/
├── docker-compose.yml              # Multi-container setup (MySQL, Redis, ES, Backend, Frontend)
├── README.md                       # Documentation
├── database/
│   └── reachinbox.sql              # Initial MySQL schema
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express server & static asset handler
│   │   ├── config/                 # Env, MySQL, Redis, Elasticsearch configuration
│   │   ├── controllers/            # Email, Search, Auth, Slack, Stats controllers
│   │   ├── middleware/             # JWT auth & error middleware
│   │   ├── models/                 # MySQL database models (emails, users, slack_integrations)
│   │   ├── queues/                 # BullMQ queue setup
│   │   ├── routes/                 # Express API routes
│   │   ├── services/               # Email SMTP, Elasticsearch, Slack, Rate limit services
│   │   └── workers/                # BullMQ email worker code
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/             # Header, Sidebar, StatCard, Badge, ConfirmModal, Toast
    │   ├── context/                # AuthContext & ToastContext
    │   ├── pages/                  # Dashboard, Schedule, CSV Upload, History, Search, Settings
    │   └── services/               # REST API fetch utilities
    └── .env.example
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
MYSQL_URL=mysql://root:password@altaria.proxy.rlwy.net:17441/railway
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

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://reachinbox-email-scheduler-1-17a7.onrender.com/api/auth/google/callback
FRONTEND_URL=https://reachinbox-email-scheduler-app.vercel.app

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://reachinbox-email-scheduler-1-17a7.onrender.com/api/auth/slack/callback
```

---

## 🛠 Local Setup & Running

### 1. Clone & Install
```bash
git clone https://github.com/taiyyaba-106/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler

# Backend setup
cd backend
npm install
cp .env.example .env

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
```

### 2. Run Backend & Frontend Locally
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:5000/api/health`
* Live BullMQ Dashboard: `http://localhost:5000/admin/queues`

---

## 📊 Live Queue Monitoring

Access the live **Bull-Board Dashboard** at [/admin/queues](https://reachinbox-email-scheduler-1-17a7.onrender.com/admin/queues) to inspect:
* Waiting & delayed email jobs
* Active worker processing jobs
* Completed and failed job metrics with stack traces
