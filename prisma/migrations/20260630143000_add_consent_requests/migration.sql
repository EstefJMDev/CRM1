CREATE TYPE "ConsentRequestStatus" AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE "consent_requests" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ConsentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "signerName" TEXT,
    "signerIp" TEXT,
    "signerUserAgent" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractId" TEXT NOT NULL,

    CONSTRAINT "consent_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consent_requests_token_key" ON "consent_requests"("token");
CREATE INDEX "consent_requests_contractId_createdAt_idx" ON "consent_requests"("contractId", "createdAt");
CREATE INDEX "consent_requests_token_idx" ON "consent_requests"("token");

ALTER TABLE "consent_requests"
ADD CONSTRAINT "consent_requests_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
