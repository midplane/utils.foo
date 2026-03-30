import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { Alert } from '../../components/ui/Alert'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { cn } from '../../lib/utils'
import { CalendarClock, Info } from 'lucide-react'
import { parseCron } from './logic'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ─── Common presets ───────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Every minute',       value: '* * * * *' },
  { label: 'Every hour',         value: '0 * * * *' },
  { label: 'Every day at noon',  value: '0 12 * * *' },
  { label: 'Every Monday 9am',   value: '0 9 * * 1' },
  { label: 'Every 1st of month', value: '0 0 1 * *' },
]

// ─── Component ────────────────────────────────────────────────────────────────

const FIELD_LABELS = ['minute', 'hour', 'day', 'month', 'weekday'] as const

export default function CronParserTool() {
  // Easter egg: "At 4:20 on Fridays" 🌿
  const [expression, setExpression] = useState('20 4 * * 5')
  const parsed = parseCron(expression)

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<CalendarClock />} title="Cron" accentedSuffix="Parser" />

      {/* Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-medium text-[var(--color-ink-muted)]">Expression</span>
            {/* Presets */}
            <SegmentedControl value={expression} onChange={setExpression} variant="bordered">
              {PRESETS.map(p => (
                <SegmentedControlItem key={p.value} value={p.value} className="px-2 py-0.5 text-[10px] font-mono">
                  {p.value}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            id="cron"
            value={expression}
            onChange={e => setExpression(e.target.value)}
            placeholder="* * * * *"
            className="font-mono text-base tracking-widest text-center"
          />

          {/* Field labels */}
          <div className="grid grid-cols-5 gap-1 text-center">
            {FIELD_LABELS.map((label, idx) => {
              const fieldKey = ['minute','hour','dom','month','dow'][idx] as keyof typeof parsed.fields
              const field = parsed.fields[fieldKey]
              return (
                <div key={label} className="space-y-0.5">
                  <div className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded',
                    !parsed.valid && field && !field.valid
                      ? 'text-red-600 bg-red-50'
                      : 'text-[var(--color-ink-muted)]'
                  )}>
                    {label}
                  </div>
                  <div className={cn(
                    'font-mono text-xs px-1 py-0.5 rounded border',
                    !parsed.valid && field && !field.valid
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-[var(--color-border)] bg-[var(--color-cream-dark)] text-[var(--color-ink)]'
                  )}>
                    {expression.trim().split(/\s+/)[idx] ?? '*'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error */}
          {!parsed.valid && (
            <Alert variant="error" size="sm">{parsed.error}</Alert>
          )}

          {/* Description */}
          {parsed.valid && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success-text)] mt-0.5 shrink-0">Runs</span>
              <div className="flex-1 flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--color-ink)] capitalize">{parsed.description}</span>
                <CopyButton text={expression} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next run times */}
      {parsed.valid && parsed.nextDates.length > 0 && (
        <Card>
          <CardHeader>
            <span className="text-xs font-semibold text-[var(--color-ink)]">Next 5 runs</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {parsed.nextDates.map((date, idx) => (
                <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)] w-4">#{idx + 1}</span>
                    <span className="font-mono text-xs text-[var(--color-ink)]">{date.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-ink-muted)]">{DAYS[date.getDay()]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="Field order"
          description="minute  hour  day  month  weekday"
        />
        <InfoCard
          icon={<Info className="text-[var(--color-success-icon)]" />}
          title="Special chars"
          description="* any   , list   - range   / step"
        />
      </div>
    </div>
  )
}

