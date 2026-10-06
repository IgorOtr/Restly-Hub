import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SupportContact {
  name: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
}

const CONTACT_KEY = 'support.contact';
const SALES_KEY = 'site.sales_contact';

/** Contato comercial exibido no site de vendas. */
export interface SalesContact {
  whatsapp: string | null;
  email: string | null;
}
const EMPTY: SupportContact = {
  name: null,
  phone: null,
  email: null,
  url: null,
};

/** Configurações simples do Hub (chave/valor). */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string) {
    return (
      (await this.prisma.setting.findUnique({ where: { key } }))?.value ?? null
    );
  }

  async set(key: string, value: string) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /** Contato exibido aos clientes nos cards de aviso/bloqueio. */
  async supportContact(): Promise<SupportContact> {
    const raw = await this.get(CONTACT_KEY);
    return raw
      ? { ...EMPTY, ...(JSON.parse(raw) as Partial<SupportContact>) }
      : EMPTY;
  }

  async setSupportContact(contact: SupportContact) {
    await this.set(CONTACT_KEY, JSON.stringify(contact));
    return contact;
  }

  async salesContact(): Promise<SalesContact> {
    const raw = await this.get(SALES_KEY);
    return {
      whatsapp: null,
      email: null,
      ...(raw ? (JSON.parse(raw) as Partial<SalesContact>) : {}),
    };
  }

  async setSalesContact(contact: SalesContact) {
    await this.set(SALES_KEY, JSON.stringify(contact));
    return contact;
  }
}
