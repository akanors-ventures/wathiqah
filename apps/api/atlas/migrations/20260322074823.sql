-- Create enum type "OptOutSource"
CREATE TYPE "OptOutSource" AS ENUM ('REPLY_STOP', 'MANUAL');
-- Create "sms_opt_outs" table
CREATE TABLE "sms_opt_outs" (
  "id" text NOT NULL,
  "phoneNumber" text NOT NULL,
  "source" "OptOutSource" NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create index "sms_opt_outs_phoneNumber_key" to table: "sms_opt_outs"
CREATE UNIQUE INDEX "sms_opt_outs_phoneNumber_key" ON "sms_opt_outs" ("phoneNumber");
