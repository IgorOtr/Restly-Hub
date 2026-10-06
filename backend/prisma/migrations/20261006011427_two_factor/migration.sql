-- AlterTable
ALTER TABLE `HubUser` ADD COLUMN `recoveryCodes` JSON NULL,
    ADD COLUMN `totpEnabledAt` DATETIME(3) NULL,
    ADD COLUMN `totpLastStep` INTEGER NULL,
    ADD COLUMN `totpPendingSecret` VARCHAR(255) NULL,
    ADD COLUMN `totpSecret` VARCHAR(255) NULL;
