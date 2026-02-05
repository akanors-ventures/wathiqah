# Wathȋqah Web

The frontend for the Wathȋqah application, built with [TanStack Start](https://tanstack.com/start) (React + TypeScript). It provides a modern, responsive UI for managing your financial ledger.

## 🛠️ Tech Stack

- **Framework**: TanStack Start (Vite + React)
- **Routing**: TanStack Router (File-based routing)
- **Data Fetching**: Apollo Client + TanStack Query
- **UI Library**: Shadcn UI (Radix Primitives + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Linting/Formatting**: Biome

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- Wathȋqah API running (usually at `http://localhost:3001`)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Key variables:
- `VITE_API_URL`: URL of the GraphQL API (default: `http://localhost:3001/api/graphql`)

Production:
- Web: https://wathiqah.akanors.com
- Configure `VITE_API_URL` to your API endpoint (e.g., `https://api.example.com/api/graphql`).

### Installation

```bash
pnpm install
```

### Running the App

```bash
# Development mode
pnpm dev
```

The app will be available at `http://localhost:3000`.

## 📂 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Shadcn components (Button, Card, etc.)
│   ├── dashboard/       # Dashboard widgets
│   ├── contacts/        # Contact management components
│   └── ...
├── routes/              # File-based routes (TanStack Router)
│   ├── index.tsx        # Dashboard
│   ├── contacts/        # Contacts pages
│   ├── transactions/    # Transactions pages
│   └── ...
├── hooks/               # Custom React hooks (useContacts, useTransactions)
├── lib/                 # Utilities and Apollo Client setup
└── types/               # TypeScript type definitions
```

## ✨ Key Features

- **Dashboard**: Overview of net balance, recent transactions, and upcoming promises.
- **Onboarding Flow**: Celebratory post-signup success page and robust email verification landing.
- **Transactions**: Record and view history of funds/items exchanged.
- **Contacts**: Manage people you interact with.
- **Witnesses**: Invite and manage witnesses for transactions.
- **Promises**: Track commitments with due dates.
- **Shared Access**: View read-only data shared by others.
- **Dark Mode**: Fully supported via Tailwind.

## 🧪 Testing

```bash
pnpm test
```

## 📝 License

This project is licensed under the MIT License.
