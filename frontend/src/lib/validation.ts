import { z } from 'zod'
import { digits } from './format'

export function isValidCpf(raw: string) {
  const cpf = digits(raw)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (len: number) => {
    let total = 0
    for (let i = 0; i < len; i++) total += Number(cpf[i]) * (len + 1 - i)
    const rest = (total * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCnpj(raw: string) {
  const c = digits(raw)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = w.reduce((a, x, i) => a + Number(c[i]) * x, 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}

export const zCpf = z.string().refine(isValidCpf, 'CPF inválido')
export const zCnpj = z.string().refine(isValidCnpj, 'CNPJ inválido')
export const zPhone = z.string().refine((v) => /^\d{10,11}$/.test(digits(v)), 'Telefone inválido')
export const zCep = z.string().refine((v) => digits(v).length === 8, 'CEP inválido')
export const zEmail = z.email('E-mail inválido')
export const zRequired = (msg: string, max = 160) => z.string().trim().min(1, msg).max(max)
