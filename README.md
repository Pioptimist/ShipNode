# ShipNode 

A **deterministic, global edge-deployment platform** designed to replicate the core functionality of Vercel and Netlify. Deploy your frontend projects from GitHub to production with instant zero-config deployments, custom domains, SSL certificates, and intelligent rollback capabilities.

## Overview

ShipNode is a full-stack application that enables developers to:
- Connect their GitHub repositories
- Automatically build and deploy on every push
- Manage custom domains with auto-SSL provisioning (Let's Encrypt)
- Rollback to previous deployments instantly
- Monitor deployments, logs, and environment variables securely

**Deployment Flow**: Push to GitHub → Automatic Build → Edge Deployment → Live in ~60 seconds

---

## Core Features

### Instant, Zero-Config Deployments
- Auto-detect Vite, Next.js, and pure React projects
- One-click project import from GitHub
- Automatic build command detection and execution

### Push-to-Deploy CI/CD
- GitHub webhooks trigger automatic deployments
- Main branch = Production environment
- Other branches = Isolated preview environments
- Real-time build logs and deployment status

### Instant Rollbacks
- Pointer-based deployment system
- Switch between versions without rebuilding
- Immediate downtime-free rollbacks

### Custom Domains & Auto-SSL
- Automatic SSL certificate provisioning via Let's Encrypt
- Custom domain routing with zero-downtime switching
- Domain verification and DNS management

### Encrypted Environment Variables
- AES-256 encryption for secure secret storage
- Environment variable management per project
- Automatic injection during build process

---

## Tech Stack

### Frontend
- **React** with **TypeScript**
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Axios** - HTTP client for API communication


### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **PostgreSQL** (Neon Serverless) - Primary database
- **Drizzle ORM** - Type-safe query builder
- **Redis** - Caching and rate-limiting
- **Socket.io** - Real-time deployment updates
- **Docker** - Build environment sandboxing

### Infrastructure
- **CLOUDFLARE R2** - Static file storage for deployments
- **Docker** - Secure, isolated build containers
- **GitHub OAuth 2.0** - Authentication

---

## System Architecture

ShipNode is built as a **3-tier microservice architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Control Plane (Frontend + API)           │
│         React Dashboard | Express API | PostgreSQL           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Build Engine                            │
│          Docker Sandboxes | Build Pipeline | S3 Storage     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Routing Layer                             │
│            Reverse Proxy | Domain Routing | SSL              │
└─────────────────────────────────────────────────────────────┘
```

### A. Control Plane
- **Dashboard**: React/Vite frontend for project management
- **API Server**: Express.js handling authentication, project management, deployments
- **Authentication**: GitHub OAuth 2.0 with JWT tokens
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Caching**: Redis for rate-limiting and log buffering
- **Real-time Updates**: WebSocket communication for live deployment status

### B. Build Engine
- **Docker Sandboxing**: Disposable containers for safe code compilation
- **Build Pipeline**: 
  1. Pull latest code from GitHub
  2. Decrypt environment variables
  3. Install dependencies (`npm install`)
  4. Execute build command (`npm run build`)
- **S3 Storage**: Built files stored in `s3://shipnode-builds/project_id/deployment_id/`
- **Log Streaming**: Real-time terminal logs saved to S3

### C. Routing Layer
- **Reverse Proxy**: Routes incoming requests to correct S3 deployment
- **Rollback Pointer**: `activeDeploymentId` in database enables instant version switching
- **SSL Termination**: Custom domain SSL management
- **Edge Distribution**: Global CDN delivery

---

## Data Model

### Core Tables (Drizzle ORM)
```
users
├── githubId (primary)
├── email
└── githubAccessToken (AES-256 encrypted)

projects
├── userId (foreign key)
├── subdomain
├── customDomain
├── domainVerified
├── activeDeploymentId (rollback pointer)
├── framework (Vite, Next.js, etc.)
├── installCommand
├── buildCommand
├── outputDirectory
└── repoName

deployments
├── projectId (foreign key)
├── status (QUEUED, BUILDING, READY, FAILED)
├── branch
├── commitHash
├── storagePath (S3 location)
├── previewUrl
└── buildLogsUrl

projectEnvs
├── projectId (foreign key)
├── key
└── value (AES-256 encrypted)


```

---

## Project Structure

```
ShipNode/
├── backend/                    # Express.js API & services
│   ├── src/
│   │   ├── api/
│   │   │   ├── server.ts      # Express app setup
│   │   │   ├── controllers/   # Route handlers
│   │   │   ├── middleware/    # Auth middleware
│   │   │   ├── routes/        # Route definitions
│   │   │   └── services/      # Business logic
│   │   ├── db/                # Database & schema
│   │   ├── lib/               # Utilities (Redis, JWT, env)
│   │   ├── proxy/             # Reverse proxy server
│   │   ├── worker/            # Build queue processor
│   │   └── utils/             # Helper functions
│   ├── base-image/            # Docker build environment
│   ├── drizzle.config.ts      # ORM configuration
│   └── package.json
│
├── frontend/                   # React + Vite dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # Login/signup flows
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── domains/       # Domain management
│   │   │   ├── landing/       # Landing page
│   │   │   ├── modals/        # Modal components
│   │   │   ├── settings/      # Settings pages
│   │   │   └── ui/            # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React context (Auth)
│   │   ├── utils/             # API helpers, environment
│   │   └── main.tsx           # Entry point
│   ├── vite.config.ts
│   └── package.json
│
├── README.md                  # This file
└── package.json              # Root workspace config
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Git**
- **PostgreSQL** database (Neon for serverless)
- **Redis** instance
- **GitHub OAuth Application** (for authentication)
- **AWS S3 Bucket** (for deployment storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ShipNode
   ```

2. **Set up environment variables**
   
   Create `.env` files in both `backend/` and `frontend/` directories:
   
   **backend/.env:**
   ```
   PORT = 
  DB_URL = 
  GITHUB_CLIENT_ID =
  GITHUB_CLIENT_SECRET =
  ACCESS_SECRET=
  REFRESH_SECRET=
  ENCRYPTION_KEY=
  FRONTEND_URL= 
  GITHUB_WEBHOOK_SECRET=
  WEBHOOK_PROXY_URL=
  R2_ENDPOINT=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_BUCKET_NAME=
   ```

   **frontend/.env:**
   ```
   VITE_BACKEND_URL=http://localhost:3031
   VITE_PLATFORM_DOMAIN=localhost:8000
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Database setup**
   ```bash
   cd backend
   npm run db:migrate  # Run Drizzle migrations
   ```

5. **Start development servers**
   
   **Backend:**
   ```bash
   cd backend
   npm run dev
   # API running on http://localhost:3031
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Dashboard running on http://localhost:5173
   ```

---

## Authentication Flow

1. User clicks "Login with GitHub"
2. Redirected to GitHub OAuth consent screen
3. GitHub returns authorization code
4. Backend exchanges code for GitHub access token
5. Token encrypted (AES-256) and stored in database
6. Custom JWT tokens generated for session
7. HttpOnly cookies secure the session

**Scopes required**: `user:email`, `repo` (for webhook access)

---

## Development

### Available Scripts

**Backend:**
```bash
npm run dev        # Start development server with hot-reload
npm run build      # Compile TypeScript
npm run start      # Run compiled server
npm run db:studio  # Open Drizzle Studio UI
```

**Frontend:**
```bash
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Key Features Implementation

- **Deployment Queue**: Redis-backed job queue in `backend/src/worker/`
- **Real-time Updates**: WebSocket handling in `backend/src/socket/`
- **GitHub Integration**: Webhook processing in `backend/src/api/controllers/githubController.ts`
- **Domain Management**: DNS & SSL in `backend/src/api/controllers/domainController.ts`
- **Environment Encryption**: AES-256 in `backend/src/utils/crypto.ts`

---

## Troubleshooting

**Build failures?**
- Check build command configuration
- Verify environment variables are set
- Review build logs in deployment details

**Custom domain not working?**
- Ensure DNS records are pointing to ShipNode
- Allow time for DNS propagation
- Verify domain ownership

**Redis connection errors?**
- Check Redis is running
- Verify `REDIS_URL` environment variable

---

## License

This project is proprietary and confidential.

---

## Contributing

When contributing, please:
1. Create a feature branch from `dev`
2. Make your changes
3. Test thoroughly
4. Create a pull request with clear description
5. Follow TypeScript and code style conventions

---

## Notes

- All tokens and secrets are encrypted before database storage
- Build containers are ephemeral and automatically cleaned up
- Deployments are immutable; rollbacks switch pointers only
- Real-time deployment status via WebSocket connections
- Analytics data helps identify performance bottlenecks


