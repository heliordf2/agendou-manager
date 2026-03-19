-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'PLUS');

-- AlterTable
ALTER TABLE "Comercio" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'STARTER';
