# MailFlow

MailFlow is a web application for creating and managing Gmail email sequences. It includes a React interface and an Express API backed by PostgreSQL. Users can compose multi-step sequences, import contacts from CSV files, schedule messages and follow-ups, and track sends, opens, and replies.

## Features

- Create, edit, duplicate, pause, resume, stop, and archive email sequences.
- Compose multi-step emails with follow-up delays and contact-specific CSV fields.
- Connect a Gmail account with Google OAuth to send and check messages.
- Schedule email sends and detect replies automatically.
- View sequence activity and delivery, open, and reply counts.
- Manage account settings, notifications, and administrator access.

## Project structure

```text
Mailflow/
├── backend/
│   ├── src/
│   │   ├── middleware/     # Authentication and access checks
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Gmail, sending, scheduling, and reply detection
│   │   ├── db.js           # PostgreSQL connection and schema initialization
│   │   ├── index.js        # Express application entry point
│   │   └── schema.sql      # Database schema
│   ├── .env.example        # Backend environment variable template
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   └── package.json
├── landing-preview/
├── DEPLOYMENT.md
└── README.md
```

## Requirements

- Node.js and npm
- PostgreSQL
- A Google Cloud project with the Gmail API enabled and OAuth credentials configured

## Local development

### 1. Configure the backend

Create a PostgreSQL database, then copy the environment template:

```sh
cd backend
cp .env.example .env
```

Set the values in `backend/.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the MailFlow database |
| `JWT_SECRET` | A private, long random string used to sign authentication tokens |
| `GMAIL_CLIENT_ID` | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret |
| `GMAIL_REDIRECT_URI` | OAuth callback URL; for local development, use `http://localhost:4000/api/auth/gmail/callback` |
| `BACKEND_URL` | Backend base URL; for local development, `http://localhost:4000` |
| `FRONTEND_URL` | Frontend origin allowed by the API; for local development, `http://localhost:3000` |
| `NODE_ENV` | Use `development` for local development |
| `PORT` | Backend port; defaults to `4000` |

Register the redirect URI in your Google Cloud OAuth client. Keep `.env` and OAuth credentials private; do not commit them.

Install dependencies and start the API:

```sh
npm install
npm run dev
```

The backend initializes the database schema on startup. It also runs scheduled jobs for sending due emails and checking for replies.

### 2. Start the frontend

In a second terminal:

```sh
cd frontend
npm install
npm start
```

The React development server runs at `http://localhost:3000` and proxies API requests to `http://localhost:4000`. To use a different API URL, set `REACT_APP_API_URL` in the frontend environment.

## Production deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the existing AWS deployment walkthrough.

## Security and email use

- Store secrets in environment variables and deployment secret stores, never in source files.
- Gmail access requires users to authorize the application through Google OAuth.
- Use the application only to contact recipients who can appropriately receive your messages, and follow applicable email and privacy requirements.
