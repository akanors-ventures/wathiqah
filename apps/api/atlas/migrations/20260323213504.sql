-- Create "project_transaction_history" table
CREATE TABLE "project_transaction_history" (
  "id" text NOT NULL,
  "projectTransactionId" text NOT NULL,
  "userId" text NOT NULL,
  "previousState" jsonb NOT NULL,
  "newState" jsonb NOT NULL,
  "changeType" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "project_transaction_history_projectTransactionId_fkey" FOREIGN KEY ("projectTransactionId") REFERENCES "project_transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "project_transaction_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
