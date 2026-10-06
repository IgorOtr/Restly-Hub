import {
  base32Decode,
  base32Encode,
  currentStep,
  totpAt,
  verifyTotp,
} from './totp';

// Vetor de teste da RFC 6238 (SHA-1): segredo ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it('base32 ida e volta', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
  });

  it('gera os códigos da RFC 6238', () => {
    expect(totpAt(RFC_SECRET, currentStep(59_000), 8)).toBe('94287082');
    expect(totpAt(RFC_SECRET, currentStep(1_111_111_109_000), 8)).toBe(
      '07081804',
    );
    expect(totpAt(RFC_SECRET, currentStep(20_000_000_000_000), 8)).toBe(
      '65353130',
    );
  });

  it('aceita ±1 intervalo e recusa códigos fora da janela ou malformados', () => {
    const now = 1_700_000_000_000;
    const step = currentStep(now);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), now)).toBe(
      step - 1,
    );
    expect(
      verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 2), now),
    ).toBeNull();
    expect(verifyTotp(RFC_SECRET, '12345', now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abcdef', now)).toBeNull();
  });
});
