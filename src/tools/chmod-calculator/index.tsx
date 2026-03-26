import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'
import { FileLock2, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermSet {
  read: boolean
  write: boolean
  execute: boolean
}

interface Permissions {
  owner: PermSet
  group: PermSet
  other: PermSet
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function permSetToOctal(p: PermSet): number {
  return (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0)
}

function permSetToSymbolic(p: PermSet): string {
  return (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-')
}

function octalDigitToPermSet(n: number): PermSet {
  return { read: !!(n & 4), write: !!(n & 2), execute: !!(n & 1) }
}

function permissionsToOctal(perms: Permissions): string {
  return `${permSetToOctal(perms.owner)}${permSetToOctal(perms.group)}${permSetToOctal(perms.other)}`
}

function permissionsToSymbolic(perms: Permissions): string {
  return permSetToSymbolic(perms.owner) + permSetToSymbolic(perms.group) + permSetToSymbolic(perms.other)
}

function octalToPermissions(octal: string): Permissions | null {
  if (!/^[0-7]{3}$/.test(octal)) return null
  return {
    owner: octalDigitToPermSet(parseInt(octal[0]!)),
    group: octalDigitToPermSet(parseInt(octal[1]!)),
    other: octalDigitToPermSet(parseInt(octal[2]!)),
  }
}

function symbolicToPermissions(sym: string): Permissions | null {
  if (!/^[rwx-]{9}$/.test(sym)) return null
  const parseSet = (s: string): PermSet => ({
    read:    s[0] === 'r',
    write:   s[1] === 'w',
    execute: s[2] === 'x',
  })
  return {
    owner: parseSet(sym.slice(0, 3)),
    group: parseSet(sym.slice(3, 6)),
    other: parseSet(sym.slice(6, 9)),
  }
}

function describePermissions(perms: Permissions): string {
  const parts: string[] = []

  const describe = (label: string, p: PermSet) => {
    const actions: string[] = []
    if (p.read)    actions.push('read')
    if (p.write)   actions.push('write')
    if (p.execute) actions.push('execute')
    if (actions.length === 0) parts.push(`${label}: no permissions`)
    else parts.push(`${label}: ${actions.join(', ')}`)
  }

  describe('Owner', perms.owner)
  describe('Group', perms.group)
  describe('Others', perms.other)
  return parts.join(' · ')
}

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
          <FileLock2 className="w-3.5 h-3.5" />
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          Chmod <span className="text-[var(--color-accent)]">Calculator</span>
        </h1>
      </div>

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
                className={cn('font-mono text-2xl text-center tracking-widest', octalError && 'border-red-400')}
                maxLength={3}
              />
              {octalError && <p className="text-[10px] text-red-600 mt-0.5">{octalError}</p>}
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
                className={cn('font-mono text-sm text-center tracking-widest', symbolicError && 'border-red-400')}
                maxLength={9}
              />
              {symbolicError && <p className="text-[10px] text-red-600 mt-0.5">{symbolicError}</p>}
            </div>
            <div className="mb-0.5">
              <CopyButton text={symbolic} />
            </div>
          </div>

          {/* chmod command */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-ink)] rounded-lg">
            <code className="font-mono text-sm text-[var(--color-cream)]">
              chmod <span className="text-emerald-400">{octal}</span> file
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
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Octal values</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5 font-mono">
                r=4  w=2  x=1  –=0
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Who is who</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Owner · Group · Other (everyone else)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

