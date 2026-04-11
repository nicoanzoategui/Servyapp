-- CreateEnum
CREATE TYPE "ProfessionalDocumentKind" AS ENUM ('dni_front', 'dni_back', 'certification');

-- CreateTable
CREATE TABLE "professional_documents" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "kind" "ProfessionalDocumentKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_documents_storage_key_key" ON "professional_documents"("storage_key");

-- CreateIndex
CREATE INDEX "professional_documents_professional_id_idx" ON "professional_documents"("professional_id");

-- CreateIndex
CREATE INDEX "professional_documents_professional_id_kind_idx" ON "professional_documents"("professional_id", "kind");

-- AddForeignKey
ALTER TABLE "professional_documents" ADD CONSTRAINT "professional_documents_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
