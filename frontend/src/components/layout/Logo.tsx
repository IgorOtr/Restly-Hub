import { Network } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-sm">
        <Network size={16} />
      </span>
      <span className="text-base font-semibold tracking-tight">
        Restly <span className="font-normal text-muted">Hub</span>
      </span>
    </div>
  )
}
