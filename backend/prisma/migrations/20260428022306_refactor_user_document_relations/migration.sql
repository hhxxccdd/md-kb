/*
  Warnings:

  - Made the column `owner_user_id` on table `document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `document` MODIFY `owner_user_id` INTEGER NOT NULL;
