import { extendTailwindMerge } from 'tailwind-merge'

/** Registra os tokens de cor do tema para o merge resolver conflitos corretamente. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ['bg', 'surface', 'surface-2', 'surface-3', 'border', 'border-strong', 'fg', 'muted', 'subtle', 'primary', 'primary-hover', 'primary-fg', 'primary-soft', 'secondary', 'secondary-fg', 'secondary-soft', 'ring', 'chart-1', 'chart-2', 'grid'],
    },
  },
})

/** Junta classes; em conflito (ex.: w-full × w-40), a última vence. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(' '))
}
