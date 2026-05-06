/*
  Warnings:

  - You are about to drop the column `creator_id` on the `document` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `document` table. All the data in the column will be lost.
  - You are about to drop the column `team_id` on the `document` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by_id` on the `document` table. All the data in the column will be lost.
  - You are about to drop the `team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teammember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `Document_creator_id_idx` ON `document`;

-- DropIndex
DROP INDEX `Document_scope_updated_at_idx` ON `document`;

-- DropIndex
DROP INDEX `Document_team_id_updated_at_idx` ON `document`;

-- AlterTable
ALTER TABLE `chatmessage` MODIFY `content` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `document` DROP COLUMN `creator_id`,
    DROP COLUMN `scope`,
    DROP COLUMN `team_id`,
    DROP COLUMN `updated_by_id`,
    ADD COLUMN `last_edited_by` INTEGER NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
    MODIFY `content` LONGTEXT NULL;

-- DropTable
DROP TABLE `team`;

-- DropTable
DROP TABLE `teammember`;

-- CreateTable
CREATE TABLE `DocumentCollaborator` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentCollaborator_user_id_idx`(`user_id`),
    UNIQUE INDEX `DocumentCollaborator_document_id_user_id_key`(`document_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentInvite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `inviter_user_id` INTEGER NOT NULL,
    `invitee_user_id` INTEGER NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentInvite_token_key`(`token`),
    INDEX `DocumentInvite_document_id_status_idx`(`document_id`, `status`),
    INDEX `DocumentInvite_invitee_user_id_idx`(`invitee_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentRevision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentRevision_document_id_created_at_idx`(`document_id`, `created_at`),
    UNIQUE INDEX `DocumentRevision_document_id_version_key`(`document_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
