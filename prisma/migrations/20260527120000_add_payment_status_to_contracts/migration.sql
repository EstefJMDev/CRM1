DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "contracts"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "paidAt" TIMESTAMP(3);
