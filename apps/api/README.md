# Wathīqah API

The backend for the Wathīqah application, built with [NestJS](https://nestjs.com/) and [Prisma](https://www.prisma.io/). It provides a GraphQL API for managing financial transactions, contacts, witnesses, and shared access.

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **API**: GraphQL (Code-first approach)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT & Passport
- **Email**: Mailtrap / SendGrid
- **SMS**: Twilio

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL running locally or remotely

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing tokens
- `MAILTRAP_TOKEN` / `SENDGRID_API_KEY`: For email delivery
- `TWILIO_ACCOUNT_SID`: For SMS delivery

### Installation

```bash
pnpm install
```

### Database Setup

Run migrations to create the database schema:

```bash
pnpm prisma migrate dev
```

(Optional) Seed the database with initial data:

```bash
pnpm prisma db seed
```

### Running the App

```bash
# Development mode
pnpm dev

# Production mode
pnpm start:prod
```

The GraphQL Playground will be available at `http://localhost:3001/api/graphql`.

CORS
- Allowed origins include `https://wathiqah.akanors.com` and `https://dev.akanors.com` by default. Update as needed in `main.ts`.

## 📂 Modules

- **Auth**: User authentication (Signup, Login, Password Reset).
- **Users**: User profile management.
- **Contacts**: Manage contacts and their balances.
- **Transactions**: Record financial/item transactions (Given, Received, Collected).
- **Witnesses**: Manage transaction witnesses and invitations.
- **Promises**: Track personal commitments and due dates.
- **Shared Access**: Grant read-only access to profiles/transactions.
- **Notifications**: Handle Email and SMS delivery.

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## 📝 License

This project is licensed under the MIT License.
