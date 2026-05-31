-- Add userId index to organisation_members for efficient findUserOrgs queries
CREATE INDEX "organisation_members_userId_idx" ON "organisation_members"("userId");
