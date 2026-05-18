CREATE TYPE "CreditPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED');

CREATE TABLE "CreditPayment" (
    "id" TEXT NOT NULL,
    "orderCode" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CreditPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentLinkId" TEXT,
    "checkoutUrl" TEXT,
    "payosStatus" TEXT,
    "rawData" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditPayment_orderCode_key" ON "CreditPayment"("orderCode");
CREATE INDEX "CreditPayment_userId_idx" ON "CreditPayment"("userId");
CREATE INDEX "CreditPayment_status_idx" ON "CreditPayment"("status");
