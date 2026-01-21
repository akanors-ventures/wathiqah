# Haafizh - Architecture & Folder Structure

## 📁 Monorepo Structure

```
haafizh/
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
│   │   └── graphql.config.ts
│   │
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.resolver.ts
│   │   │   ├── dto/              # Data Transfer Objects
│   │   │   │   ├── login.input.ts
│   │   │   │   └── register.input.ts
│   │   │   ├── entities/         # GraphQL entities
│   │   │   │   └── auth.entity.ts
│   │   │   └── strategies/       # Passport strategies
│   │   │       └── jwt.strategy.ts
│   │   │
│   │   ├── users/                # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.resolver.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.input.ts
│   │   │   │   └── update-user.input.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── contacts/             # Contacts module
│   │   │   ├── contacts.module.ts
│   │   │   ├── contacts.service.ts
│   │   │   ├── contacts.resolver.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-contact.input.ts
│   │   │   │   └── update-contact.input.ts
│   │   │   └── entities/
│   │   │       └── contact.entity.ts
│   │   │
│   │   ├── transactions/         # Transactions module
│   │   │   ├── transactions.module.ts
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.resolver.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-transaction.input.ts
│   │   │   │   └── filter-transaction.input.ts
│   │   │   └── entities/
│   │   │       └── transaction.entity.ts
│   │   │
│   │   └── witnesses/            # Witnesses module
│   │       ├── witnesses.module.ts
│   │       ├── witnesses.service.ts
│   │       ├── witnesses.resolver.ts
│   │       ├── dto/
│   │       │   ├── add-witness.input.ts
│   │       │   ├── witness-invite.input.ts
│   │       │   └── acknowledge-witness.input.ts
│   │       └── entities/
│   │           └── witness.entity.ts
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
│   ├── auth.e2e-spec.ts
│   ├── contacts.e2e-spec.ts
│   └── transactions.e2e-spec.ts
│
├── .env                          # Environment variables
├── .env.example
├── nest-cli.json
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
│   │   │   ├── form.tsx
│   │   │   └── input.tsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── contacts/             # Contact-specific components
│   │   │   ├── ContactCard.tsx
│   │   │   ├── ContactList.tsx
│   │   │   └── ContactForm.tsx
│   │   │
│   │   ├── transactions/         # Transaction-specific components
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   └── TransactionForm.tsx
│   │   │
│   │   └── witnesses/            # Witness-specific components
│   │       ├── WitnessCard.tsx
│   │       ├── WitnessList.tsx
│   │       ├── WitnessInviteForm.tsx
│   │       └── WitnessStatusBadge.tsx
│   │
│   ├── routes/                   # TanStack Router pages
│   │   ├── __root.tsx            # Root layout
│   │   ├── index.tsx             # Home page
│   │   ├── auth/                 # Auth pages
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── contacts/             # Contact pages
│   │   │   ├── index.tsx         # List contacts
│   │   │   └── $contactId.tsx    # Contact detail
│   │   ├── transactions/         # Transaction pages
│   │   │   ├── index.tsx         # List transactions
│   │   │   └── new.tsx           # Create transaction
│   │   └── witnesses/            # Witness pages
│   │       ├── index.tsx         # My witness requests
│   │       └── invite.$token.tsx # Witness invitation acceptance
│   │
│   ├── lib/                      # Core utilities
│   │   ├── apollo/               # Apollo Client setup
│   │   │   ├── client.ts
│   │   │   └── queries/          # GraphQL queries
│   │   │       ├── contacts.ts
│   │   │       ├── transactions.ts
│   │   │       ├── witnesses.ts
│   │   │       └── auth.ts
│   │   │
│   │   ├── utils/                # Helper functions
│   │   │   ├── cn.ts             # Class name utility
│   │   │   ├── formatters.ts     # Date/currency formatters
│   │   │   └── validators.ts     # Form validators
│   │   │
│   │   └── constants/            # App constants
│   │       └── index.ts
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   ├── useContacts.ts        # Contacts data hook
│   │   ├── useTransactions.ts    # Transactions data hook
│   │   └── useWitnesses.ts       # Witnesses data hook
│   │
│   ├── types/                    # TypeScript types
│   │   ├── contact.ts
│   │   ├── transaction.ts
│   │   ├── witness.ts
│   │   └── user.ts
│   │
│   ├── styles/                   # Global styles
│   │   ├── globals.css
│   │   └── themes.css
│   │
│   ├── router.tsx                # Router configuration
│   └── main.tsx                  # Entry point
│
├── public/                       # Static assets
│   ├── favicon.ico
│   └── images/
│
├── .env.local                    # Environment variables
├── .env.example
├── biome.json
├── components.json               # Shadcn config
├── package.json
├── tsconfig.json
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

### Overview

The witness system allows users to add witnesses to transactions for accountability and trust. Witnesses can be existing users or new users invited via email/link.

### Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  passwordHash  String?   // Null for invited witnesses who haven't set password
  createdAt     DateTime  @default(now())
  
  // Relations
  transactions  Transaction[]  @relation("TransactionCreator")
  contacts      Contact[]
  witnessRecords Witness[]     @relation("WitnessUser")
  
  @@map("users")
}

model Contact {
  id           String    @id @default(uuid())
  name         String
  email        String?
  phoneNumber  String?
  createdAt    DateTime  @default(now())
  
  // Relations
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  transactions Transaction[]
  
  @@map("contacts")
}

model Transaction {
  id          String    @id @default(uuid())
  category    AssetCategory @default(FUNDS)
  amount      Decimal?  @db.Decimal(10, 2) // Optional if it's a physical item
  itemName    String?   // For physical items (e.g., "Laptop", "Book")
  quantity    Int?      @default(1)
  type        TransactionType
  date        DateTime
  description String?
  createdAt   DateTime  @default(now())
  
  // Relations
  contactId   String
  contact     Contact   @relation(fields: [contactId], references: [id])
  createdById String
  createdBy   User      @relation("TransactionCreator", fields: [createdById], references: [id])
  witnesses   Witness[]
  
  @@map("transactions")
}

enum AssetCategory {
  FUNDS
  ITEM
}

model Witness {
  id              String         @id @default(uuid())
  status          WitnessStatus  @default(PENDING)
  invitedAt       DateTime       @default(now())
  acknowledgedAt  DateTime?
  inviteToken     String?        @unique  // For new user invitations
  
  // Relations
  transactionId   String
  transaction     Transaction    @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  userId          String
  user            User           @relation("WitnessUser", fields: [userId], references: [id])
  
  @@unique([transactionId, userId])  // Prevent duplicate witnesses
  @@map("witnesses")
}

enum WitnessStatus {
  PENDING
  ACKNOWLEDGED
  DECLINED
}

enum TransactionType {
  GIVEN
  RECEIVED
  COLLECTED
}
```

### Data Flow: Adding Witnesses

```
1. User creates transaction with witnesses
   ↓
2. Frontend sends mutation with:
   - witnessUserIds: ["existing-user-1", "existing-user-2"]
   - witnessInvites: [{ email: "new@example.com", name: "New User" }]
   ↓
3. Backend (TransactionService):
   a. Create transaction
   b. For existing users:
      - Create Witness records with status: PENDING
      - (Future: Send notification)
   c. For new users:
      - Create User record (passwordHash: null)
      - Generate unique inviteToken
      - Create Witness record with inviteToken
      - (Future: Send email with invitation link)
   ↓
4. Return transaction with witnesses
```

### Data Flow: Witness Acknowledgment

```
1. Witness receives notification/email
   ↓
2. Clicks invitation link: /witnesses/invite/{token}
   ↓
3. Frontend:
   a. If new user: Show signup form (set password)
   b. If existing user: Show login
   ↓
4. After auth, show transaction details
   ↓
5. Witness clicks "Acknowledge" or "Decline"
   ↓
6. Backend (WitnessService):
   - Update witness status
   - Set acknowledgedAt timestamp
   - Clear inviteToken (if used)
   ↓
7. Transaction creator sees updated witness status
```

### GraphQL Schema

```graphql
type Witness {
  id: ID!
  user: User!
  transaction: Transaction!
  status: WitnessStatus!
  invitedAt: DateTime!
  acknowledgedAt: DateTime
}

enum WitnessStatus {
  PENDING
  ACKNOWLEDGED
  DECLINED
}

type Transaction {
  id: ID!
  amount: Float!
  type: TransactionType!
  date: DateTime!
  description: String
  contact: Contact!
  createdBy: User!
  witnesses: [Witness!]!
  createdAt: DateTime!
}

input WitnessInviteInput {
  email: String!
  name: String!
}

input CreateTransactionInput {
  contactId: ID!
  amount: Float!
  type: TransactionType!
  date: DateTime!
  description: String
  witnessUserIds: [ID!]      # Existing users
  witnessInvites: [WitnessInviteInput!]  # New users
}

type Mutation {
  createTransaction(input: CreateTransactionInput!): Transaction!
  acknowledgeWitness(witnessId: ID!, status: WitnessStatus!): Witness!
}

type Query {
  myWitnessRequests(status: WitnessStatus): [Witness!]!
  transaction(id: ID!): Transaction
}
```

### Frontend Components

#### WitnessInviteForm.tsx
```typescript
// Used in TransactionForm to add witnesses
- Search existing users (autocomplete)
- Add email addresses for new users
- Display selected witnesses with remove option
```

#### WitnessStatusBadge.tsx
```typescript
// Display witness status with color coding
- PENDING: Yellow/Orange
- ACKNOWLEDGED: Green
- DECLINED: Red
```

#### WitnessList.tsx
```typescript
// Show all witnesses for a transaction
- User avatar/name
- Status badge
- Acknowledgment timestamp
```

#### Witness Request Page (routes/witnesses/index.tsx)
```typescript
// Show all pending witness requests for current user
- List of transactions awaiting acknowledgment
- Quick acknowledge/decline actions
- Transaction details preview
```

#### Witness Invitation Page (routes/witnesses/invite.$token.tsx)
```typescript
// Handle witness invitation acceptance
1. Validate token
2. Show signup form (if new user) or login
3. Display transaction details
4. Acknowledge/Decline buttons
```

### Security Considerations

1. **Token Validation**: Invite tokens should be:
   - UUID v4 (cryptographically secure)
   - Single-use (cleared after first use)
   - Time-limited (optional: expire after 7 days)

2. **Authorization**:
   - Only transaction creator can add witnesses
   - Only the invited user can acknowledge their witness record
   - Witnesses can view transaction details but not modify

3. **Privacy**:
   - Witnesses only see transactions they're invited to
   - Email addresses are not exposed to other witnesses

### Implementation Priority

1. **Phase 1 (MVP)**:
   - ✅ Database schema
   - ✅ Add existing users as witnesses
   - ✅ Witness acknowledgment (logged-in users)
   - ✅ Display witness status

2. **Phase 2**:
   - Invite new users via email
   - Generate invitation links
   - Email notifications
   - Witness onboarding flow

3. **Phase 3**:
   - Real-time notifications (GraphQL subscriptions)
   - SMS notifications
   - Witness activity timeline

---

## 📦 Shared Packages (Future)

```
packages/
├── types/                        # Shared TypeScript types
│   ├── src/
│   │   ├── contact.ts
│   │   ├── transaction.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── utils/                        # Shared utilities
    ├── src/
    │   ├── formatters.ts
    │   └── validators.ts
    ├── package.json
    └── tsconfig.json
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

### Monorepo
- ✅ Use Turborepo for task orchestration
- ✅ Share types via `packages/types`
- ✅ Keep dependencies isolated per app
- ✅ Use pnpm for efficient package management

---

## 🚀 Next Steps

1. **Backend**: Set up Prisma schema and GraphQL resolvers
2. **Frontend**: Create Apollo Client configuration
3. **Shared**: Create `packages/types` for shared TypeScript types
4. **Testing**: Add unit and E2E tests
5. **Deployment**: Configure CI/CD pipeline
