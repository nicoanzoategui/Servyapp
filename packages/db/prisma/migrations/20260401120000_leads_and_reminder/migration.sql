-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "reminder_sent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "professional_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_leads_pkey" PRIMARY KEY ("id")
);
