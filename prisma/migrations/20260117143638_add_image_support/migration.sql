-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hasImage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT;
