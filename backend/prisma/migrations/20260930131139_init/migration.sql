-- CreateTable
CREATE TABLE `HubUser` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HubUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HubSession` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `refreshTokenHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `ip` VARCHAR(64) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HubSession_refreshTokenHash_key`(`refreshTokenHash`),
    INDEX `HubSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` CHAR(36) NOT NULL,
    `clientNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `document` VARCHAR(14) NULL,
    `ownerName` VARCHAR(120) NULL,
    `ownerPhone` VARCHAR(20) NULL,
    `ownerEmail` VARCHAR(160) NULL,
    `notes` TEXT NULL,
    `monthlyFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dueDay` INTEGER NULL,
    `status` ENUM('ACTIVE', 'WARNING', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `reason` VARCHAR(80) NULL,
    `message` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `statusChangedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `instanceKeyHash` CHAR(64) NOT NULL,
    `instanceKeyPrefix` VARCHAR(12) NOT NULL,
    `lastCheckAt` DATETIME(3) NULL,
    `lastCheckIp` VARCHAR(64) NULL,
    `lastVersion` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `archivedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Client_clientNumber_key`(`clientNumber`),
    UNIQUE INDEX `Client_slug_key`(`slug`),
    INDEX `Client_status_idx`(`status`),
    INDEX `Client_archivedAt_idx`(`archivedAt`),
    INDEX `Client_lastCheckAt_idx`(`lastCheckAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LicenseEvent` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('ACTIVE', 'WARNING', 'BLOCKED') NULL,
    `toStatus` ENUM('ACTIVE', 'WARNING', 'BLOCKED') NOT NULL,
    `reason` VARCHAR(80) NULL,
    `message` TEXT NULL,
    `userId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LicenseEvent_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `LicenseEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(80) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HubSession` ADD CONSTRAINT `HubSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HubUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseEvent` ADD CONSTRAINT `LicenseEvent_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseEvent` ADD CONSTRAINT `LicenseEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HubUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
