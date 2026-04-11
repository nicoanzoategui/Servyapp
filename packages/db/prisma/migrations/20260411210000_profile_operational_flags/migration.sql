-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "profile_operational_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_ready_whatsapp_sent_at" TIMESTAMP(3);
