import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';
import { SettingsService } from '../settings/settings.service';

const KEY_SETTING = 'signing.privateKey';

/**
 * Chave Ed25519 do Hub. As licenças são assinadas com a chave privada e cada
 * instalação valida com a chave pública (LICENSE_HUB_PUBLIC_KEY).
 *
 * A chave vem de HUB_SIGNING_PRIVATE_KEY ou, na falta dela, é gerada no primeiro
 * início e guardada no banco. Trocar a chave invalida todas as instalações até
 * que recebam a nova chave pública.
 */
@Injectable()
export class SigningService implements OnModuleInit {
  private readonly logger = new Logger('Signing');
  private privateKey!: KeyObject;
  private publicKeyBase64!: string;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit() {
    const fromEnv = this.config
      .get<string>('HUB_SIGNING_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    let pem = fromEnv || (await this.settings.get(KEY_SETTING));
    if (!pem) {
      const { privateKey } = generateKeyPairSync('ed25519');
      pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
      await this.settings.set(KEY_SETTING, pem);
      this.logger.warn('Chave de assinatura gerada e armazenada no banco.');
    }
    this.privateKey = createPrivateKey(pem);
    this.publicKeyBase64 = createPublicKey(this.privateKey)
      .export({ format: 'der', type: 'spki' })
      .toString('base64');
  }

  /** Chave pública (DER/SPKI em base64) configurada nas instalações. */
  publicKey() {
    return this.publicKeyBase64;
  }

  /** Assina o payload e devolve a resposta no formato do protocolo de licença. */
  signPayload(payload: object) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      payload: encoded,
      signature: sign(
        null,
        Buffer.from(encoded, 'utf8'),
        this.privateKey,
      ).toString('base64'),
    };
  }
}
