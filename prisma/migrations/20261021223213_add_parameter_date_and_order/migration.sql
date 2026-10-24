-- AlterEnum
ALTER TYPE "ParameterType" ADD VALUE 'DATE';

-- AlterTable
ALTER TABLE "ParameterDefinition" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
