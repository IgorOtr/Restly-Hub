export const onlyDigits = (v: string) => (v ?? '').replace(/\D/g, '');

export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len: number) => {
    let total = 0;
    for (let i = 0; i < len; i++) total += Number(cpf[i]) * (len + 1 - i);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCnpj(raw: string): boolean {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const total = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
