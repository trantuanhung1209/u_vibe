CREATE TABLE "CreditBalance" (
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("userId")
);

INSERT INTO "CreditBalance" ("userId", "credits", "updatedAt")
SELECT "userId", SUM("credits")::INTEGER, CURRENT_TIMESTAMP
FROM "CreditPayment"
WHERE "status" = 'PAID'
GROUP BY "userId"
ON CONFLICT ("userId") DO UPDATE SET
    "credits" = "CreditBalance"."credits" + EXCLUDED."credits",
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Usage" AS usage
SET "points" = GREATEST(usage."points" + balance."credits", 0)
FROM "CreditBalance" AS balance
WHERE usage."key" = balance."userId"
  AND usage."points" < 0;
