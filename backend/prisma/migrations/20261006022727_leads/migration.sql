-- CreateTable
CREATE TABLE `Lead` (
    `id` CHAR(36) NOT NULL,
    `leadNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(160) NULL,
    `restaurantName` VARCHAR(160) NOT NULL,
    `city` VARCHAR(120) NULL,
    `tablesRange` VARCHAR(20) NULL,
    `message` VARCHAR(1000) NULL,
    `status` ENUM('NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
    `notes` TEXT NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_leadNumber_key`(`leadNumber`),
    INDEX `Lead_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Lead_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
