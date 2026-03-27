import { useState, useEffect } from 'react'
import { Clock, ArrowUpDown, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'

export default function EpochConverter() {
  // Initialize with current time
  const [timestamp, setTimestamp] = useState(() => Math.floor(Date.now() / 1000).toString())
  const [dateString, setDateString] = useState(() => new Date().toLocaleString())
  const [timezone, setTimezone] = useState('local')
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleTimestampChange = (value: string) => {
    setTimestamp(value)
    if (!value.trim()) { setDateString(''); return }
    const num = parseInt(value, 10)
    if (isNaN(num)) { setDateString('Invalid timestamp'); return }
    const ms = value.length > 10 || num > 9999999999 ? num : num * 1000
    const date = new Date(ms)
    if (isNaN(date.getTime())) { setDateString('Invalid timestamp'); return }
    setDateString(timezone === 'utc' ? date.toISOString() : date.toLocaleString())
  }

  const handleDateChange = (value: string) => {
    setDateString(value)
    if (!value.trim()) { setTimestamp(''); return }
    const date = new Date(value)
    if (isNaN(date.getTime())) { setTimestamp('Invalid date'); return }
    setTimestamp(Math.floor(date.getTime() / 1000).toString())
  }

  const handleNow = () => {
    const now = Date.now()
    setTimestamp(Math.floor(now / 1000).toString())
    const date = new Date(now)
    setDateString(timezone === 'utc' ? date.toISOString() : date.toLocaleString())
  }

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz)
    if (timestamp && !isNaN(parseInt(timestamp, 10))) {
      const num = parseInt(timestamp, 10)
      const ms = timestamp.length > 10 || num > 9999999999 ? num : num * 1000
      const date = new Date(ms)
      setDateString(tz === 'utc' ? date.toISOString() : date.toLocaleString())
    }
  }

  const nowSeconds = Math.floor(currentTime / 1000)
  const nowMs = currentTime

  return (
    <div className="space-y-3 animate-fade-in">
      <ToolHeader icon={<Clock />} title="Epoch" accentedSuffix="Converter" />

      {/* Live Clock - Compact */}
      <Card className="overflow-hidden">
        <div className="bg-[var(--color-ink)] px-3 py-2">
          <div className="flex items-center justify-between text-[var(--color-cream)]">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full block" />
                <span className="absolute inset-0 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider">Live</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-cream)]/50 uppercase">sec</span>
                <span className="font-mono text-sm tabular-nums">{nowSeconds}</span>
                <CopyButton text={nowSeconds.toString()} className="!py-0.5 !px-1.5 bg-white/10 border-white/20 text-[var(--color-cream)] hover:bg-white/20 text-[9px]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-cream)]/50 uppercase">ms</span>
                <span className="font-mono text-sm tabular-nums">{nowMs}</span>
                <CopyButton text={nowMs.toString()} className="!py-0.5 !px-1.5 bg-white/10 border-white/20 text-[var(--color-cream)] hover:bg-white/20 text-[9px]" />
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
              <SegmentedControl value={timezone} onChange={handleTimezoneChange}>
                <SegmentedControlItem value="local" className="px-2 py-0.5 text-[10px]">Local</SegmentedControlItem>
                <SegmentedControlItem value="utc" className="px-2 py-0.5 text-[10px]">UTC</SegmentedControlItem>
              </SegmentedControl>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Unix Timestamp"
                  placeholder="1699900800 or 1699900800000"
                  value={timestamp}
                  onChange={(e) => handleTimestampChange(e.target.value)}
                  id="timestamp"
                  className="font-mono"
                />
              </div>
              {timestamp && !timestamp.includes('Invalid') && (
                <div className="flex items-end">
                  <CopyButton text={timestamp} />
                </div>
              )}
            </div>

            <FlowDivider icon={<ArrowUpDown />} hasOutput={!!timestamp && !!dateString && !timestamp.includes('Invalid') && !dateString.includes('Invalid')} />

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Human Date"
                  placeholder="2023-11-13T12:00:00"
                  value={dateString}
                  onChange={(e) => handleDateChange(e.target.value)}
                  id="date"
                />
              </div>
              {dateString && !dateString.includes('Invalid') && (
                <div className="flex items-end">
                  <CopyButton text={dateString} />
                </div>
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
        <span>Auto-detects seconds (10 digits) vs milliseconds (13 digits)</span>
      </div>
    </div>
  )
}

