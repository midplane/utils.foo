import { useState, useEffect } from 'react'
import { Clock, ArrowUpDown, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import { Alert } from '../../components/ui/Alert'
import {
  describeDate,
  formatDate,
  formatTimestamp,
  parseDate,
  parseTimestamp,
  type Unit,
  type Zone,
} from './convert'

/** The current time, rounded down to a whole second to match a seconds timestamp. */
const nowToSecond = () => Math.floor(Date.now() / 1000) * 1000

export default function EpochConverter() {
  // The instant both fields show. It is null while either field is empty or invalid.
  const [instant, setInstant] = useState<number | null>(nowToSecond)
  // The unit of the last timestamp the user entered, so that a date edit does
  // not change a milliseconds timestamp into seconds.
  const [unit, setUnit] = useState<Unit>('s')
  const [zone, setZone] = useState<Zone>('local')
  const [timestamp, setTimestamp] = useState(() => (instant === null ? '' : formatTimestamp(instant, 's')))
  const [dateString, setDateString] = useState(() => (instant === null ? '' : formatDate(instant, 'local')))
  const [timestampError, setTimestampError] = useState('')
  const [dateError, setDateError] = useState('')
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleTimestampChange = (value: string) => {
    setTimestamp(value)
    setDateError('')
    if (!value.trim()) { setInstant(null); setTimestampError(''); setDateString(''); return }
    const parsed = parseTimestamp(value)
    if (!parsed.ok) { setInstant(null); setTimestampError(parsed.error); setDateString(''); return }
    setTimestampError('')
    setInstant(parsed.value.ms)
    setUnit(parsed.value.unit)
    setDateString(formatDate(parsed.value.ms, zone))
  }

  const handleDateChange = (value: string) => {
    setDateString(value)
    setTimestampError('')
    if (!value.trim()) { setInstant(null); setDateError(''); setTimestamp(''); return }
    const parsed = parseDate(value, zone)
    if (!parsed.ok) { setInstant(null); setDateError(parsed.error); setTimestamp(''); return }
    setDateError('')
    setInstant(parsed.value)
    setTimestamp(formatTimestamp(parsed.value, unit))
  }

  const handleNow = () => {
    const now = nowToSecond()
    setInstant(now)
    setUnit('s')
    setTimestamp(formatTimestamp(now, 's'))
    setDateString(formatDate(now, zone))
    setTimestampError('')
    setDateError('')
  }

  const handleTimezoneChange = (value: string) => {
    const next: Zone = value === 'utc' ? 'utc' : 'local'
    setZone(next)
    if (instant !== null) setDateString(formatDate(instant, next))
  }

  const nowSeconds = Math.floor(currentTime / 1000)
  const nowMs = currentTime

  return (
    <div className="space-y-3 animate-fade-in">
      <ToolHeader icon={<Clock />} title="Epoch" accentedSuffix="Converter" />

      {/* Live Clock - Compact */}
      <Card className="overflow-hidden">
        <div className="bg-[var(--color-cream-dark)] px-3 py-2">
          <div className="flex items-center justify-between gap-3 flex-wrap text-[var(--color-ink)]">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-1.5 h-1.5 bg-[var(--color-success-icon)] rounded-full block" />
                <span className="absolute inset-0 w-1.5 h-1.5 bg-[var(--color-success-icon)] rounded-full animate-ping" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider">Live</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-ink-muted)] uppercase">sec</span>
                <span className="font-mono text-sm tabular-nums">{nowSeconds}</span>
                <CopyButton text={nowSeconds.toString()} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-ink-muted)] uppercase">ms</span>
                <span className="font-mono text-sm tabular-nums">{nowMs}</span>
                <CopyButton text={nowMs.toString()} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Converter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-ink)]">Convert</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase">TZ</span>
              <SegmentedControl value={zone} onChange={handleTimezoneChange}>
                <SegmentedControlItem value="local" className="px-2 py-0.5 text-[10px]">Local</SegmentedControlItem>
                <SegmentedControlItem value="utc" className="px-2 py-0.5 text-[10px]">UTC</SegmentedControlItem>
              </SegmentedControl>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Unix Timestamp"
                    placeholder="1699900800 or 1699900800000"
                    value={timestamp}
                    onChange={(e) => handleTimestampChange(e.target.value)}
                    id="timestamp"
                    className="font-mono"
                    aria-invalid={!!timestampError}
                  />
                </div>
                {timestamp && !timestampError && (
                  <div className="flex items-end">
                    <CopyButton text={timestamp} />
                  </div>
                )}
              </div>
              {timestampError && <Alert variant="error" size="sm">{timestampError}</Alert>}
            </div>

            <FlowDivider icon={<ArrowUpDown />} hasOutput={instant !== null} />

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Human Date"
                    placeholder="2023-11-13T12:00:00"
                    value={dateString}
                    onChange={(e) => handleDateChange(e.target.value)}
                    id="date"
                    className="font-mono"
                    aria-invalid={!!dateError}
                  />
                </div>
                {dateString && !dateError && (
                  <div className="flex items-end">
                    <CopyButton text={dateString} />
                  </div>
                )}
              </div>
              {dateError && <Alert variant="error" size="sm">{dateError}</Alert>}
              {instant !== null && (
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {describeDate(instant, zone)}
                </p>
              )}
            </div>

            <div className="flex justify-center pt-1">
              <Button onClick={handleNow} variant="primary" size="sm" className="gap-1.5">
                <Clock className="w-3 h-3" />
                Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tip */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--color-cream-dark)] rounded border border-[var(--color-border)] text-[10px] text-[var(--color-ink-muted)]">
        <Lightbulb className="w-3 h-3 text-[var(--color-accent)]" />
        <span>Auto-detects seconds (up to 10 digits) vs milliseconds (11–13 digits). A date without an offset uses the selected time zone.</span>
      </div>
    </div>
  )
}

