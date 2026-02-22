# Installation & Setup

This guide covers how to set up the Wathīqah development environment locally.

## ✅ Prerequisites

Ensure you have the following installed on your machine:

*   **Node.js**: Version 18 or higher (LTS recommended).
*   **pnpm**: Version 9.0.0 or higher (Managed via Corepack or `npm i -g pnpm`).
*   **PostgreSQL**: Version 14 or higher (Local instance or Docker container).
*   **Git**: For version control.

## 🛠️ Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/akanors-ventures/wathiqah.git
cd wathiqah
```

### 2. Install Dependencies

We use `pnpm` workspaces to manage dependencies for both the frontend and backend.

```bash
pnpm install
```

### 3. Environment Configuration

You need to configure environment variables for both the API and the Web app.

#### Backend (`apps/api`)

1.  Navigate to the API directory:
    ```bash
    cd apps/api
    ```
2.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
3.  Edit `.env` and configure:
    *   `DATABASE_URL`: Your PostgreSQL connection string.
    *   `JWT_SECRET`: A secure random string for authentication.
    *   `REDIS_URL`: (Optional) For caching/queues if enabled.
    *   `MAIL_XXX`: Email provider credentials (SendGrid/Mailtrap).

#### Frontend (`apps/web`)

1.  Navigate to the Web directory:
    ```bash
    cd apps/web
    ```
2.  Copy the example environment file:
    ```bash
    cp .env.example .env.local
    ```
3.  Edit `.env.local` and configure:
    *   `VITE_API_URL`: URL of your local backend (usually `http://localhost:3000/graphql`).

### 4. Database Setup

Initialize the database using Prisma.

```bash
# From the root or apps/api directory
pnpm prisma migrate dev --name init
```

(Optional) Seed the database with test data:
```bash
pnpm prisma db seed
```

### 5. Running the Application

You can run the entire stack from the root directory using Turbo.

```bash
# Starts both API and Web in development mode
pnpm dev
```

*   **Frontend**: Open [http://localhost:3000](http://localhost:3000)
*   **Backend GraphQL Playground**: Open [http://localhost:3001/api/graphql](http://localhost:3001/api/graphql)

## 🧪 Running Tests

Wathīqah uses Jest for backend testing.

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e
```

## 🐳 Docker Setup (Optional)

You can also run the database services using Docker Compose.

```bash
docker-compose up -d db redis
```
