import { cn } from '@/lib/utils'

export function Toggle({ checked, className, disabled, label, onCheckedChange, ariaLabel }: { checked: boolean; className?: string; disabled?: boolean; label: string; onCheckedChange: (checked: boolean) => void; ariaLabel?: string }) {
  return <label className={cn('toggle-button', className)}><input type="checkbox" role="switch" checked={checked} disabled={disabled} aria-label={ariaLabel} onChange={(event) => onCheckedChange(event.target.checked)} /><span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span><span>{label}</span></label>
}
