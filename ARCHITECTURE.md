# Wathȋqah - Architecture & Folder Structure

## 📁 Monorepo Structure

```
wathiqah/
├── apps/
│   ├── api/          # NestJS GraphQL Backend
│   └── web/          # TanStack Start Frontend
├── packages/         # Shared code (future)
│   └── types/        # Shared TypeScript types
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 🔧 Backend Structure (`apps/api`)

### Recommended Folder Structure

```
apps/api/
├── src/
│   ├── common/                    # Shared utilities
│   │   ├── decorators/           # Custom decorators
│   │   ├── filters/              # Exception filters
│   │   ├── guards/               # Auth guards
│   │   ├── interceptors/         # Request/Response interceptors
│   │   ├── pipes/                # Validation pipes
│   │   └── utils/                # Helper functions
│   │
│   ├── config/                   # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── graphql.config.ts
│   │   ├── mailtrap.config.ts    # Email config
│   │   └── index.ts
│   │
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.resolver.ts
│   │   │   ├── dto/              # Data Transfer Objects
│   │   │   └── entities/         # GraphQL entities
│   │   │
│   │   ├── users/                # Users module
│   │   ├── contacts/             # Contacts module
│   │   │
│   │   ├── transactions/         # Transactions module
│   │   │   ├── transactions.module.ts
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.resolver.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   │
│   │   ├── witnesses/            # Witnesses module
│   │   │   ├── witnesses.module.ts
│   │   │   ├── witnesses.service.ts
│   │   │   ├── witnesses.resolver.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   │
│   │   ├── shared-access/        # Shared Access module
│   │   │   ├── shared-access.module.ts
│   │   │   ├── shared-access.service.ts
│   │   │   ├── shared-access.resolver.ts
│   │   │   └── entities/
│   │   │
│   │   ├── promises/             # Promises module
│   │   │   ├── promises.module.ts
│   │   │   ├── promises.service.ts
│   │   │   ├── promises.resolver.ts
│   │   │   └── entities/
│   │   │
│   │   ├── projects/             # Projects & Funds module
│   │   │   ├── projects.module.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.resolver.ts
│   │   │   └── entities/
│   │   │
│   │   └── notifications/        # Notification module
│   │       ├── notification.service.ts
│   │       └── providers/
│   │
│   ├── prisma/                   # Prisma ORM
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── schema.prisma         # Database schema
│   │
│   ├── app.module.ts             # Root module
│   └── main.ts                   # Entry point
│
├── test/                         # E2E tests
├── .env                          # Environment variables
├── package.json
└── tsconfig.json
```

### Key Principles (Backend)

1. **Module-based Architecture**: Each feature is a self-contained module
2. **Separation of Concerns**:
   - `Resolvers` handle GraphQL queries/mutations
   - `Services` contain business logic
   - `Entities` define GraphQL schema
   - `DTOs` validate input data
3. **Shared Code**: Common utilities in `common/` folder
4. **Configuration**: Centralized in `config/` folder
5. **Audit Trail**: 
   - Uses `TransactionHistory` model to track changes.
   - Captures `previousState` and `newState` for all updates.
   - Enforces immutability for witnessed transactions by using `CANCELLED` status instead of deletion.
6. **Error Handling & Resilience**:
   - **Database Pool Tuning**: Uses optimized `pg` pool settings (`idleTimeoutMillis: 30000`, `keepAlive: true`) to prevent "Server has closed the connection" errors common with managed databases.
   - **GraphQL Error Masking**: Implements a global `formatError` in `AppModule` to mask technical Prisma or database-specific error messages with user-friendly text while preserving technical logs on the server.

---

## 🎨 Frontend Structure (`apps/web`)

### Recommended Folder Structure

```
apps/web/
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── dashboard/            # Dashboard components
│   │   ├── contacts/             # Contact-specific components
│   │   ├── transactions/         # Transaction-specific components
│   │   ├── witnesses/            # Witness-specific components
│   │   ├── promises/             # Promise-specific components
│   │   ├── projects/             # Project-specific components
│   │   └── shared-access/        # Shared Access components
│   │
│   ├── routes/                   # TanStack Router pages
│   │   ├── __root.tsx            # Root layout
│   │   ├── index.tsx             # Dashboard/Home
│   │   ├── auth/                 # Auth pages
│   │   ├── contacts/             # Contact pages
│   │   ├── transactions/         # Transaction pages
│   │   ├── witnesses/            # Witness pages
│   │   ├── promises/             # Promise pages
│   │   ├── projects/             # Project pages
│   │   ├── shared-access/        # Shared Access pages
│   │   └── settings.tsx          # Settings page
│   │
│   ├── lib/                      # Core utilities
│   │   ├── apollo/               # Apollo Client setup
│   │   ├── utils/                # Helper functions
│   │   └── constants/            # App constants
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   ├── useContacts.ts        # Contacts data hook
│   │   ├── useTransactions.ts    # Transactions data hook
│   │   ├── useWitnesses.ts       # Witnesses data hook
│   │   ├── usePromises.ts        # Promises data hook
│   │   ├── useProjects.ts        # Projects data hook
│   │   └── useSharedAccess.ts    # Shared Access data hook
│   │
│   ├── types/                    # TypeScript types
│   │
│   ├── styles/                   # Global styles
│   │
│   ├── router.tsx                # Router configuration
│   └── main.tsx                  # Entry point
│
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── biome.json
├── package.json
└── vite.config.ts
```

### Key Principles (Frontend)

1. **Component-based Architecture**: Reusable, composable components
2. **Feature-based Organization**: Group related components together
3. **Separation of Concerns**:
   - `components/` for UI components
   - `routes/` for pages
   - `lib/` for business logic and API calls
   - `hooks/` for stateful logic
   - `types/` for TypeScript definitions
4. **Colocation**: Keep related files close (e.g., all contact components in `components/contacts/`)

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Web)                       │
│                                                              │
│  User Interaction → Component → Hook → Apollo Client        │
│                                            ↓                 │
└────────────────────────────────────────────┼─────────────────┘
                                             │
                                   GraphQL Query/Mutation
                                             │
┌────────────────────────────────────────────┼─────────────────┐
│                         Backend (API)       ↓                │
│                                                              │
│  Resolver → Service → Prisma → PostgreSQL                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Witness System Architecture

See [WITNESS_SYSTEM.md](./WITNESS_SYSTEM.md) for detailed architecture of the witness system.

---

## 📦 Shared Packages (Future)

```
packages/
├── types/                        # Shared TypeScript types
└── utils/                        # Shared utilities
```

**Why?** Share types between frontend and backend to ensure consistency.

---

## 🎯 Best Practices

### Backend (NestJS)

- ✅ Use DTOs for input validation
- ✅ Use Guards for authentication/authorization
- ✅ Use Interceptors for logging and transformations
- ✅ Keep business logic in Services, not Resolvers
- ✅ Use Prisma for type-safe database access

### Frontend (TanStack Start)

- ✅ Use Apollo Client for GraphQL queries
- ✅ Use TanStack Query for caching
- ✅ Keep components small and focused
- ✅ Use custom hooks for reusable logic
- ✅ Use Shadcn for consistent UI
- ✅ Use Biome for linting and formatting

### Monorepo

- ✅ Use Turborepo for task orchestration
- ✅ Share types via `packages/types`
- ✅ Keep dependencies isolated per app
- ✅ Use pnpm for efficient package management
