import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'

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
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-6 h-6 rounded bg-[var(--color-accent)] flex items-center justify-center text-white">
            <ClockIcon className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Epoch <span className="text-[var(--color-accent)]">Converter</span>
          </h1>
        </div>
      </div>

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
              <div className="flex bg-[var(--color-cream-dark)] rounded p-0.5 border border-[var(--color-border)]">
                <button
                  onClick={() => handleTimezoneChange('local')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                    timezone === 'local' ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => handleTimezoneChange('utc')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                    timezone === 'utc' ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
                  }`}
                >
                  UTC
                </button>
              </div>
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

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

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
                <ClockIcon className="w-3 h-3" />
                Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Tip */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--color-cream-dark)] rounded border border-[var(--color-border)] text-[10px] text-[var(--color-ink-muted)]">
        <LightbulbIcon className="w-3 h-3 text-[var(--color-accent)]" />
        <span>Auto-detects seconds (10 digits) vs milliseconds (13 digits)</span>
      </div>
    </div>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ArrowUpDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}
