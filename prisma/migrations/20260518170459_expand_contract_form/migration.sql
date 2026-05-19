-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientLastName" TEXT,
    "clientType" TEXT NOT NULL,
    "clientDNI" TEXT,
    "clientPhone" TEXT,
    "clientSMS" TEXT,
    "clientEmail" TEXT,
    "clientIBAN" TEXT,
    "supplyType" TEXT NOT NULL,
    "commercializer" TEXT NOT NULL,
    "requestType" TEXT,
    "cups" TEXT,
    "cupsGas" TEXT,
    "tariff" TEXT,
    "lightTariff" TEXT,
    "gasTariff" TEXT,
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT,
    "municipality" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "roadType" TEXT,
    "roadName" TEXT,
    "roadNumber" TEXT,
    "secondaryZipCode" TEXT,
    "secondaryMunicipality" TEXT,
    "secondaryProvince" TEXT,
    "secondaryRoadType" TEXT,
    "secondaryRoadName" TEXT,
    "secondaryRoadNumber" TEXT,
    "pdv" TEXT,
    "scheduledCallDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "activationDate" TIMESTAMP(3),
    "inactiveDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_userId_idx" ON "contracts"("userId");

-- CreateIndex
CREATE INDEX "documents_contractId_idx" ON "documents"("contractId");

-- CreateIndex
CREATE INDEX "interactions_contractId_idx" ON "interactions"("contractId");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
