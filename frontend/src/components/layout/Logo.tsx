import { RestlyMark } from './RestlyMark'

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <RestlyMark className="h-7" />
      <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold tracking-wide text-primary uppercase">Hub</span>
    </div>
  )
}
