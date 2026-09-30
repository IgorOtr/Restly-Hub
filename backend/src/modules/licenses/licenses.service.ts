import { Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashInstanceKey } from '../clients/clients.service';
import { defaultLicenseMessage } from '../clients/license-messages';
import { SettingsService } from '../settings/settings.service';
import { SigningService } from '../signing/signing.service';

export interface LicenseCheckInput {
  instanceId: string;
  nonce: string;
  version?: string | null;
  needsSetup?: boolean;
  key: string | undefined;
  ip?: string;
}

/** Endpoint consultado pelas instalações (protocolo em docs/licenca.md do Restly). */
@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signing: SigningService,
    private readonly settings: SettingsService,
  ) {}

  async check(input: LicenseCheckInput) {
    const client = await this.prisma.client.findUnique({
      where: { slug: input.instanceId },
    });
    // Mesma resposta para instalação inexistente e chave errada.
    const expected = Buffer.from(
      client?.instanceKeyHash ?? hashInstanceKey(''),
      'hex',
    );
    const received = Buffer.from(hashInstanceKey(input.key ?? ''), 'hex');
    if (!client || !input.key || !timingSafeEqual(expected, received))
      throw new UnauthorizedException('Instalação não autorizada');

    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        lastCheckAt: new Date(),
        lastCheckIp: input.ip ?? null,
        lastVersion: input.version?.slice(0, 40) ?? null,
        ...(input.needsSetup !== undefined && {
          needsSetup: input.needsSetup,
          // Administrador criado: o convite não tem mais utilidade.
          ...(input.needsSetup === false && { setupToken: null }),
        }),
      },
    });

    // Cliente encerrado: sempre bloqueado.
    const status = client.archivedAt ? 'BLOCKED' : client.status;
    const reason = client.archivedAt ? 'CONTRACT_ENDED' : client.reason;
    return this.signing.signPayload({
      instanceId: client.slug,
      nonce: input.nonce,
      status,
      reason,
      message: client.message ?? defaultLicenseMessage(status, reason),
      contact: await this.settings.supportContact(),
      dueDate: client.dueDate?.toISOString() ?? null,
      issuedAt: new Date().toISOString(),
    });
  }
}
