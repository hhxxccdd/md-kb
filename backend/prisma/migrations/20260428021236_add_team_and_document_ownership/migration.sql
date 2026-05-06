/*
  Warnings:

  - A unique constraint covering the columns `[user_id,doc_id]` on the table `ChatSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `document` ADD COLUMN `creator_id` INTEGER NULL,
    ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `owner_user_id` INTEGER NULL,
    ADD COLUMN `scope` ENUM('PRIVATE', 'TEAM') NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN `team_id` INTEGER NULL,
    ADD COLUMN `updated_by_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Team_created_by_idx`(`created_by`),
    INDEX `Team_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TeamMember_user_id_idx`(`user_id`),
    UNIQUE INDEX `TeamMember_team_id_user_id_key`(`team_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ChatMessage_session_id_created_at_idx` ON `ChatMessage`(`session_id`, `created_at`);

-- CreateIndex
CREATE INDEX `ChatSession_doc_id_idx` ON `ChatSession`(`doc_id`);

-- CreateIndex
CREATE UNIQUE INDEX `ChatSession_user_id_doc_id_key` ON `ChatSession`(`user_id`, `doc_id`);

-- CreateIndex
CREATE INDEX `Document_scope_updated_at_idx` ON `Document`(`scope`, `updated_at`);

-- CreateIndex
CREATE INDEX `Document_owner_user_id_updated_at_idx` ON `Document`(`owner_user_id`, `updated_at`);

-- CreateIndex
CREATE INDEX `Document_team_id_updated_at_idx` ON `Document`(`team_id`, `updated_at`);

-- CreateIndex
CREATE INDEX `Document_creator_id_idx` ON `Document`(`creator_id`);

-- CreateIndex
CREATE INDEX `Document_is_deleted_updated_at_idx` ON `Document`(`is_deleted`, `updated_at`);
