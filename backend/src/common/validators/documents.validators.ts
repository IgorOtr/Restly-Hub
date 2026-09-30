import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCnpj, isValidCpf, onlyDigits } from '../utils/documents';

/** Normaliza strings para apenas dígitos (CPF, CNPJ, telefone, CEP). */
export const Digits = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? onlyDigits(value) : value,
  );

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

function makeValidator(
  name: string,
  check: (v: string) => boolean,
  message: string,
) {
  return (options?: ValidationOptions) =>
    (object: object, propertyName: string) =>
      registerDecorator({
        name,
        target: object.constructor,
        propertyName,
        options: { message, ...options },
        validator: {
          validate: (value: unknown) =>
            typeof value === 'string' && check(value),
        },
      });
}

export const IsCpf = makeValidator('isCpf', isValidCpf, 'CPF inválido');
export const IsCnpj = makeValidator('isCnpj', isValidCnpj, 'CNPJ inválido');
export const IsPhoneBR = makeValidator(
  'isPhoneBR',
  (v) => /^\d{10,11}$/.test(v),
  'Telefone inválido',
);
export const IsCep = makeValidator(
  'isCep',
  (v) => /^\d{8}$/.test(v),
  'CEP inválido',
);
