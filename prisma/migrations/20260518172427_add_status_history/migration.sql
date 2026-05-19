-- CreateTable
CREATE TABLE "contract_status_history" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observations" TEXT,
    "changedBy" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_status_history_contractId_createdAt_idx" ON "contract_status_history"("contractId", "createdAt");

-- AddForeignKey
ALTER TABLE "contract_status_history" ADD CONSTRAINT "contract_status_history_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
