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
   - **Error Handling & Resilience**:
    - **Database Pool Tuning**: Uses optimized `pg` pool settings (`idleTimeoutMillis: 30000`, `keepAlive: true`) to prevent "Server has closed the connection" errors common with managed databases.
    - **GraphQL Error Masking**: Implements a global `formatError` in `AppModule` to mask technical Prisma or database-specific error messages with user-friendly text while preserving technical logs on the server.
  - **Exchange Rate Service**:
    - **Dual-Provider Strategy**: Integrated with **Open Exchange Rates** (Primary, hourly updates) and **ExchangeRate-API** (Fallback) to ensure 24/7 reliability.
    - **Intelligent Caching**: Uses a 1-hour TTL cache for rates, with a persistent database fallback (`ExchangeRate` table).
    - **Automated Sync**: A cron job runs every other hour to fetch the latest rates and archive history in `ExchangeRateHistory`.
    - **Precision**: Uses `Prisma.Decimal` for all financial calculations to prevent floating-point errors.
    - **Base Currency**: Uses a USD-base cross-conversion logic to allow any-to-any currency conversion efficiently.
  - **Invitation & Onboarding System**:
    - **Secure Tokens**: Uses UUID-based secure tokens for invitations, stored with an expiration in the database.
    - **Contextual Onboarding**: Invitation links carry `token` and `email` to streamline the signup process.
    - **Automatic Reconciliation**: Automatically links new users to **all** existing contact records across the platform matching their email address on signup.
    - **Email Integration**: Leverages SendGrid for high-deliverability invitation and verification emails.
7. **Strict Type Safety**:
   - The codebase strictly enforces **No `any`** types.
   - All external API responses are typed with interfaces.
   - Form validation is handled by Zod, with types inferred directly from schemas.
   - Backend services use DTOs and Prisma-generated types for end-to-end safety.

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
│   │   ├── login.tsx             # Login page
│   │   ├── signup.tsx            # Registration page
│   │   ├── signup-success.tsx    # Post-signup success/onboarding
│   │   ├── verify-email.tsx      # Email verification landing
│   │   ├── forgot-password.tsx   # Password recovery
│   │   ├── reset-password.tsx    # Password reset landing
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

1. **Onboarding Isolation**:
   - Onboarding pages (`/signup`, `/signup-success`, `/verify-email`, `/login`, `/forgot-password`, `/reset-password`) are isolated from the global `AuthContext` to prevent unintended side effects and unnecessary network calls.
   - The `ME_QUERY` in `AuthContext` is skipped for these paths using route-based logic.
   - These pages use the global `useAuth` hook for GraphQL mutations, ensuring code consistency and separation of concerns while maintaining isolation via the context's skip logic.
   - Refresh token logic in `apollo-links.ts` is bypassed for these mutations to prevent infinite loops during the authentication and recovery processes.

2. **Component-based Architecture**: Reusable, composable components
3. **Feature-based Organization**: Group related components together
4. **Separation of Concerns**:
   - `components/` for UI components
   - `routes/` for pages
   - `lib/` for business logic and API calls
   - `hooks/` for stateful logic
   - `types/` for TypeScript definitions
5. **Colocation**: Keep related files close (e.g., all contact components in `components/contacts/`)

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

## 🔐 Authentication & Onboarding Flow

Wathȋqah uses a multi-step onboarding process to ensure account security and email validity.

### 1. Registration (`/signup`)
- User provides name, email, and password.
- System creates a `PENDING` user record and triggers a verification email.

### 2. Success Feedback (`/signup-success`)
- Immediately after signup, users are redirected to this celebratory page.
- **Purpose**: Acknowledges registration, provides clear next steps, and allows resending the verification link if not received.
- **Personalization**: Greets the user by name and displays their registered email for confirmation.

### 3. Email Verification (`/verify-email`)
- Triggered by clicking the link in the verification email.
- **Process**: Validates the token against the backend.
- **Outcome**: 
    - **Success**: Activates the account and provides a direct CTA to log in.
    - **Failure**: Displays clear error context and provides a resend form to get a new link.

### 4. Login (`/login`)
- Authenticates active users via JWT.
- Redirects to the dashboard or the previously intended protected route.

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

### User Experience & Personalization

- **Preferred Currency**: Users can set a persistent preferred currency in **Account Settings > Preferences**. This currency is used globally for:
  - Total Balance calculation on the Dashboard.
  - Default view for financial summaries.
  - Consistency across devices.
- **Dynamic Conversion**: The Dashboard allows temporary currency switching for quick reference, while respecting the user's saved preference as the default state.

### Monorepo

- ✅ Use Turborepo for task orchestration
- ✅ Share types via `packages/types`
- ✅ Keep dependencies isolated per app
- ✅ Use pnpm for efficient package management
