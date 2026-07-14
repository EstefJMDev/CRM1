ALTER TABLE "consent_requests"
ADD COLUMN "requestedIp" TEXT,
ADD COLUMN "requestedUserAgent" TEXT,
ADD COLUMN "requestedBrowser" TEXT,
ADD COLUMN "requestedOs" TEXT,
ADD COLUMN "approvedIp" TEXT,
ADD COLUMN "approvedUserAgent" TEXT,
ADD COLUMN "approvedBrowser" TEXT,
ADD COLUMN "approvedOs" TEXT,
ADD COLUMN "legalTextVersion" TEXT NOT NULL DEFAULT '2026-07',
ADD COLUMN "legalTextHash" TEXT;
