-- MVP asignación manual: JobOffer puede existir sin técnico.
ALTER TABLE "job_offers" ALTER COLUMN "professional_id" DROP NOT NULL;

-- Antecedentes penales (admin carga docs del técnico).
DO $$ BEGIN
    ALTER TYPE "ProfessionalDocumentKind" ADD VALUE 'criminal_record';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
