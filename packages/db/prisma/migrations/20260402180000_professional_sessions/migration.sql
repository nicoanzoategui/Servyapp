-- CreateTable
CREATE TABLE "professional_sessions" (
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "data_json" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_sessions_pkey" PRIMARY KEY ("phone")
);
