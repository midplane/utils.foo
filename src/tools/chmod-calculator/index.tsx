import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { cn } from '../../lib/utils'
import { FileLock2, Info } from 'lucide-react'
import {
  type PermSet,
  type Permissions,
  permSetToOctal,
  permSetToSymbolic,
  permissionsToOctal,
  permissionsToSymbolic,
  octalToPermissions,
  symbolicToPermissions,
  describePermissions,
} from './logic'

// ─── Common presets ───────────────────────────────────────────────────────────

const PRESETS: { label: string; octal: string; description: string }[] = [
  { label: '644', octal: '644', description: 'Standard file' },
  { label: '755', octal: '755', description: 'Executable / dir' },
  { label: '600', octal: '600', description: 'Private file' },
  { label: '777', octal: '777', description: 'Full access' },
  { label: '400', octal: '400', description: 'Read-only' },
]

// ─── Sub-component: permission row ───────────────────────────────────────────

function PermRow({
  label,
  permSet,
  onChange,
}: {
  label: string
  permSet: PermSet
  onChange: (p: PermSet) => void
}) {
  const toggle = (bit: keyof PermSet) =>
    onChange({ ...permSet, [bit]: !permSet[bit] })

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-[var(--color-ink)] w-12">{label}</span>
      <div className="flex gap-1.5">
        {(['read', 'write', 'execute'] as const).map(bit => (
          <button
            key={bit}
            onClick={() => toggle(bit)}
            className={cn(
              'w-8 h-8 rounded-lg text-xs font-mono font-bold border transition-all',
              permSet[bit]
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                : 'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            )}
          >
            {bit[0]?.toUpperCase()}
          </button>
        ))}
      </div>
      <span className="font-mono text-xs text-[var(--color-ink-muted)] w-4">{permSetToOctal(permSet)}</span>
      <span className="font-mono text-xs text-[var(--color-ink-muted)]">{permSetToSymbolic(permSet)}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_PERMS: Permissions = {
  // Easter egg: 755 - the classic "just deployed to prod" permission
  owner: { read: true,  write: true,  execute: true  },
  group: { read: true,  write: false, execute: true  },
  other: { read: true,  write: false, execute: true  },
}

export default function ChmodCalculatorTool() {
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS)
  const [octalInput, setOctalInput] = useState('755')
  const [octalError, setOctalError] = useState('')
  const [symbolicInput, setSymbolicInput] = useState('rwxr-xr-x')
  const [symbolicError, setSymbolicError] = useState('')

  const updateFromPerms = (p: Permissions) => {
    setPerms(p)
    setOctalInput(permissionsToOctal(p))
    setSymbolicInput(permissionsToSymbolic(p))
    setOctalError('')
    setSymbolicError('')
  }

  const handleOctalChange = (value: string) => {
    setOctalInput(value)
    setOctalError('')
    const parsed = octalToPermissions(value)
    if (!parsed) {
      setOctalError('Must be 3 octal digits (0–7)')
      return
    }
    setPerms(parsed)
    setSymbolicInput(permissionsToSymbolic(parsed))
    setSymbolicError('')
  }

  const handleSymbolicChange = (value: string) => {
    setSymbolicInput(value)
    setSymbolicError('')
    const parsed = symbolicToPermissions(value)
    if (!parsed) {
      setSymbolicError('Must be 9 chars: rwxrwxrwx or dashes')
      return
    }
    setPerms(parsed)
    setOctalInput(permissionsToOctal(parsed))
    setOctalError('')
  }

  const octal = permissionsToOctal(perms)
  const symbolic = permissionsToSymbolic(perms)

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<FileLock2 />} title="Chmod" accentedSuffix="Calculator" />

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.octal}
            onClick={() => {
              const parsed = octalToPermissions(p.octal)!
              updateFromPerms(parsed)
            }}
            className={cn(
              'px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5',
              octal === p.octal
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border-[var(--color-border)] hover:text-[var(--color-ink)]'
            )}
          >
            <span className="font-mono font-bold">{p.octal}</span>
            <span className="text-[10px] opacity-70">{p.description}</span>
          </button>
        ))}
      </div>

      {/* Toggle grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-ink)]">Toggle permissions</span>
            <div className="flex gap-3 text-[10px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">
              <span className="w-8 text-center">R</span>
              <span className="w-8 text-center">W</span>
              <span className="w-8 text-center">X</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <PermRow label="Owner" permSet={perms.owner} onChange={p => updateFromPerms({ ...perms, owner: p })} />
          <PermRow label="Group" permSet={perms.group} onChange={p => updateFromPerms({ ...perms, group: p })} />
          <PermRow label="Other" permSet={perms.other} onChange={p => updateFromPerms({ ...perms, other: p })} />
        </CardContent>
      </Card>

      {/* Outputs */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          {/* Octal */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="octal"
                label="Octal"
                value={octalInput}
                onChange={e => handleOctalChange(e.target.value)}
                className={cn('font-mono text-2xl text-center tracking-widest', octalError && 'border-[var(--color-error-border)]')}
                maxLength={3}
              />
              {octalError && <p className="text-[10px] text-[var(--color-error-text)] mt-0.5">{octalError}</p>}
            </div>
            <div className="mb-0.5">
              <CopyButton text={octal} />
            </div>
          </div>

          {/* Symbolic */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="symbolic"
                label="Symbolic"
                value={symbolicInput}
                onChange={e => handleSymbolicChange(e.target.value)}
                className={cn('font-mono text-sm text-center tracking-widest', symbolicError && 'border-[var(--color-error-border)]')}
                maxLength={9}
              />
              {symbolicError && <p className="text-[10px] text-[var(--color-error-text)] mt-0.5">{symbolicError}</p>}
            </div>
            <div className="mb-0.5">
              <CopyButton text={symbolic} />
            </div>
          </div>

          {/* chmod command */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-ink)] rounded-lg">
            <code className="font-mono text-sm text-[var(--color-cream)]">
              chmod <span className="text-[var(--color-success-text)]">{octal}</span> file
            </code>
            <CopyButton text={`chmod ${octal} file`} className="!bg-white/10 !border-white/20 !text-[var(--color-cream)] hover:!bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-ink)]">{describePermissions(perms)}</p>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="Octal values"
          description="r=4  w=2  x=1  –=0"
        />
        <InfoCard
          icon={<Info className="text-[var(--color-success-icon)]" />}
          title="Who is who"
          description="Owner · Group · Other (everyone else)"
        />
      </div>
    </div>
  )
}

