-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN     "cascade_position" INTEGER,
ADD COLUMN     "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "response_time_sec" INTEGER,
ADD COLUMN     "timeout_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "availability_status" TEXT NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "avg_response_seconds" INTEGER,
ADD COLUMN     "current_job_offer_id" TEXT,
ADD COLUMN     "last_status_change" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "total_jobs_accepted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_jobs_offered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_jobs_rejected" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "password_tokens" ADD CONSTRAINT "password_tokens_email_fkey" FOREIGN KEY ("email") REFERENCES "professionals"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
