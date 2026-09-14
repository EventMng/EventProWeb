-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "created_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
