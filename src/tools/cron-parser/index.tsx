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

// ─── Cron parsing logic ───────────────────────────────────────────────────────

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

interface CronField {
  raw: string
  description: string
  valid: boolean
  error?: string
}

interface ParsedCron {
  valid: boolean
  error?: string
  description: string
  fields: {
    minute: CronField
    hour: CronField
    dom: CronField
    month: CronField
    dow: CronField
  }
  nextDates: Date[]
}

function parseField(
  value: string,
  min: number,
  max: number,
  names?: string[]
): CronField {
  const raw = value

  // Replace names with numbers
  let v = value.toLowerCase()
  if (names) {
    names.forEach((name, idx) => {
      v = v.replace(new RegExp(name.toLowerCase(), 'g'), String(idx))
    })
  }

  if (v === '*') return { raw, description: 'every', valid: true }

  // Step: */n or n/n
  const stepMatch = v.match(/^(\*|\d+)\/(\d+)$/)
  if (stepMatch) {
    const step = parseInt(stepMatch[2]!)
    const start = stepMatch[1] === '*' ? min : parseInt(stepMatch[1]!)
    if (isNaN(step) || step < 1) return { raw, description: '', valid: false, error: `Invalid step` }
    const label = names ? (names[start] ?? String(start)) : String(start)
    return { raw, description: `every ${step} (starting at ${label})`, valid: true }
  }

  // List: a,b,c
  if (v.includes(',')) {
    const parts = v.split(',')
    const nums = parts.map(p => parseInt(p))
    if (nums.some(n => isNaN(n) || n < min || n > max)) {
      return { raw, description: '', valid: false, error: `Value out of range (${min}-${max})` }
    }
    const labels = nums.map(n => names ? (names[n] ?? String(n)) : String(n))
    return { raw, description: labels.join(', '), valid: true }
  }

  // Range: a-b
  if (v.includes('-')) {
    const [a, b] = v.split('-').map(p => parseInt(p))
    if (isNaN(a!) || isNaN(b!) || a! < min || b! > max || a! > b!) {
      return { raw, description: '', valid: false, error: `Invalid range (${min}-${max})` }
    }
    const la = names ? (names[a!] ?? String(a)) : String(a)
    const lb = names ? (names[b!] ?? String(b)) : String(b)
    return { raw, description: `${la} through ${lb}`, valid: true }
  }

  // Single number
  const n = parseInt(v)
  if (isNaN(n) || n < min || n > max) {
    return { raw, description: '', valid: false, error: `Value out of range (${min}-${max})` }
  }
  const label = names ? (names[n] ?? String(n)) : String(n)
  return { raw, description: label, valid: true }
}

function humanMinute(f: CronField) {
  if (f.description === 'every') return 'every minute'
  return `at minute ${f.description}`
}

function humanHour(f: CronField) {
  if (f.description === 'every') return 'every hour'
  return `past hour ${f.description}`
}

function humanDOM(f: CronField) {
  if (f.description === 'every') return null
  return `on day ${f.description} of the month`
}

function humanMonth(f: CronField) {
  if (f.description === 'every') return null
  return `in ${f.description}`
}

function humanDOW(f: CronField) {
  if (f.description === 'every') return null
  return `on ${f.description}`
}

function parseCron(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/)

  if (parts.length !== 5) {
    return {
      valid: false,
      error: 'A cron expression must have exactly 5 fields: minute hour day month weekday',
      description: '',
      fields: {
        minute: { raw: '', description: '', valid: false },
        hour:   { raw: '', description: '', valid: false },
        dom:    { raw: '', description: '', valid: false },
        month:  { raw: '', description: '', valid: false },
        dow:    { raw: '', description: '', valid: false },
      },
      nextDates: [],
    }
  }

  const [m, h, dom, month, dow] = parts as [string,string,string,string,string]

  const fields = {
    minute: parseField(m,    0, 59),
    hour:   parseField(h,    0, 23),
    dom:    parseField(dom,  1, 31),
    month:  parseField(month,1, 12, MONTH_ABBR),
    dow:    parseField(dow,  0,  7, DAY_ABBR),
  }

  const invalid = Object.entries(fields).find(([, f]) => !f.valid)
  if (invalid) {
    return {
      valid: false,
      error: `Invalid ${invalid[0]} field: ${invalid[1].error}`,
      description: '',
      fields,
      nextDates: [],
    }
  }

  // Build English description
  const segments: string[] = []
  segments.push(humanMinute(fields.minute))
  segments.push(humanHour(fields.hour))
  const domStr  = humanDOM(fields.dom)
  const monthStr = humanMonth(fields.month)
  const dowStr  = humanDOW(fields.dow)
  if (domStr)   segments.push(domStr)
  if (monthStr) segments.push(monthStr)
  if (dowStr)   segments.push(dowStr)
  const description = segments.join(', ')

  // Compute next 5 run dates
  const nextDates = computeNextDates(parts as [string,string,string,string,string], 5)

  return { valid: true, description, fields, nextDates }
}

// Lightweight next-date calculator (no external dependency)
function matchesField(value: number, expr: string, min: number, max: number): boolean {
  const v = expr.toLowerCase()
    .replace(/jan/g,'1').replace(/feb/g,'2').replace(/mar/g,'3').replace(/apr/g,'4')
    .replace(/may/g,'5').replace(/jun/g,'6').replace(/jul/g,'7').replace(/aug/g,'8')
    .replace(/sep/g,'9').replace(/oct/g,'10').replace(/nov/g,'11').replace(/dec/g,'12')
    .replace(/sun/g,'0').replace(/mon/g,'1').replace(/tue/g,'2').replace(/wed/g,'3')
    .replace(/thu/g,'4').replace(/fri/g,'5').replace(/sat/g,'6')

  if (v === '*') return true

  const stepMatch = v.match(/^(\*|\d+)\/(\d+)$/)
  if (stepMatch) {
    const start = stepMatch[1] === '*' ? min : parseInt(stepMatch[1]!)
    const step  = parseInt(stepMatch[2]!)
    return value >= start && (value - start) % step === 0
  }

  if (v.includes(',')) return v.split(',').map(Number).includes(value)

  if (v.includes('-')) {
    const [a, b] = v.split('-').map(Number)
    return value >= a! && value <= b!
  }

  const n = parseInt(v)
  // DOW: 7 is also Sunday (0)
  return value === n || (max === 7 && n === 7 && value === 0)
}

function computeNextDates(parts: [string,string,string,string,string], count: number): Date[] {
  const [mExpr, hExpr, domExpr, monthExpr, dowExpr] = parts
  const results: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)

  const limit = 200000 // max iterations (~138 days of minutes)
  let iterations = 0

  while (results.length < count && iterations < limit) {
    iterations++
    const min   = d.getMinutes()
    const hour  = d.getHours()
    const dom   = d.getDate()
    const month = d.getMonth() + 1
    const dow   = d.getDay()

    if (
      matchesField(month, monthExpr!, 1, 12) &&
      matchesField(dom,   domExpr!,   1, 31) &&
      matchesField(dow,   dowExpr!,   0, 7)  &&
      matchesField(hour,  hExpr!,     0, 23) &&
      matchesField(min,   mExpr!,     0, 59)
    ) {
      results.push(new Date(d))
    }
    d.setMinutes(d.getMinutes() + 1)
  }
  return results
}

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

