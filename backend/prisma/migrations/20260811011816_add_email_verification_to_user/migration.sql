-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "verificationToken" TEXT;
