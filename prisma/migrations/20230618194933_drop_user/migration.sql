/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "createdAt" SET DEFAULT now();

-- DropTable
DROP TABLE "User";
