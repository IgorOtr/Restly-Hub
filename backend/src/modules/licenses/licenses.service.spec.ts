import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { connectionOf, hashInstanceKey } from '../clients/clients.service';
import { defaultLicenseMessage } from '../clients/license-messages';
import { LicensesService } from './licenses.service';
import { SigningService } from '../signing/signing.service';

const KEY = 'rk_chave-da-instalacao';

function setup(client: Record<string, unknown> | null) {
  const { privateKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const signing = new SigningService(
    { get: () => pem } as never,
    { get: () => Promise.resolve(null), set: () => Promise.resolve() } as never,
  );
  const update = jest.fn();
  const prisma = {
    client: { findUnique: () => Promise.resolve(client), update },
  };
  const settings = {
    supportContact: () =>
      Promise.resolve({ name: 'Suporte', phone: null, email: null, url: null }),
  };
  const service = new LicensesService(
    prisma as never,
    signing,
    settings as never,
  );
  return { service, signing, update };
}

const client = {
  id: 'c1',
  slug: 'terragaucha',
  instanceKeyHash: hashInstanceKey(KEY),
  status: 'WARNING',
  reason: 'PAYMENT_OVERDUE',
  message: null,
  dueDate: new Date('2026-10-10T12:00:00Z'),
  archivedAt: null,
};

const decode = (payload: string) =>
  JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<
    string,
    unknown
  >;

describe('consulta de licença', () => {
  it('responde com payload assinado, verificável pela chave pública', async () => {
    const { service, signing, update } = setup(client);
    await signing.onModuleInit();
    const res = await service.check({
      instanceId: 'terragaucha',
      nonce: 'abc12345',
      key: KEY,
    });

    const publicKey = createPublicKey({
      key: Buffer.from(signing.publicKey(), 'base64'),
      format: 'der',
      type: 'spki',
    });
    expect(
      verify(
        null,
        Buffer.from(res.payload, 'utf8'),
        publicKey,
        Buffer.from(res.signature, 'base64'),
      ),
    ).toBe(true);

    const p = decode(res.payload);
    expect(p).toMatchObject({
      instanceId: 'terragaucha',
      nonce: 'abc12345',
      status: 'WARNING',
    });
    expect(p.message).toBe(defaultLicenseMessage('WARNING', 'PAYMENT_OVERDUE'));
    expect(update).toHaveBeenCalled();
  });

  it('recusa chave errada e instalação inexistente da mesma forma', async () => {
    const a = setup(client);
    await a.signing.onModuleInit();
    await expect(
      a.service.check({
        instanceId: 'terragaucha',
        nonce: 'abc12345',
        key: 'rk_errada',
      }),
    ).rejects.toThrow('não autorizada');

    const b = setup(null);
    await b.signing.onModuleInit();
    await expect(
      b.service.check({
        instanceId: 'nao-existe',
        nonce: 'abc12345',
        key: KEY,
      }),
    ).rejects.toThrow('não autorizada');
  });

  it('cliente encerrado sempre recebe BLOCKED', async () => {
    const { service, signing } = setup({
      ...client,
      status: 'ACTIVE',
      archivedAt: new Date(),
    });
    await signing.onModuleInit();
    const res = await service.check({
      instanceId: 'terragaucha',
      nonce: 'abc12345',
      key: KEY,
    });
    expect(decode(res.payload)).toMatchObject({
      status: 'BLOCKED',
      reason: 'CONTRACT_ENDED',
    });
  });
});

describe('monitoramento da instalação', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  it('classifica a comunicação', () => {
    expect(connectionOf(null, now)).toBe('NEVER');
    expect(connectionOf(new Date(now - 5 * 60_000), now)).toBe('ONLINE');
    expect(connectionOf(new Date(now - 20 * 60_000), now)).toBe('OFFLINE');
  });
});
