import { useState, useRef, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { Calendar, CalendarClock, ChevronDown, Globe, MousePointer2, Search, Sparkles } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TZEntry {
  id: string
  iana: string         // IANA timezone identifier
  label: string        // e.g. "New York"
  abbr: string         // e.g. "EST"
  isLocal: boolean
}

// ─── Timezone data ────────────────────────────────────────────────────────────

const TIMEZONE_LIST: { iana: string; label: string; region: string }[] = [
  // Americas
  { iana: 'Pacific/Honolulu',                 label: 'Honolulu',         region: 'Americas' },
  { iana: 'America/Anchorage',                label: 'Anchorage',        region: 'Americas' },
  { iana: 'America/Los_Angeles',              label: 'Los Angeles',      region: 'Americas' },
  { iana: 'America/Vancouver',                label: 'Vancouver',        region: 'Americas' },
  { iana: 'America/Tijuana',                  label: 'Tijuana',          region: 'Americas' },
  { iana: 'America/Phoenix',                  label: 'Phoenix',          region: 'Americas' },
  { iana: 'America/Denver',                   label: 'Denver',           region: 'Americas' },
  { iana: 'America/Chicago',                  label: 'Chicago',          region: 'Americas' },
  { iana: 'America/Mexico_City',              label: 'Mexico City',      region: 'Americas' },
  { iana: 'America/New_York',                 label: 'New York',         region: 'Americas' },
  { iana: 'America/Toronto',                  label: 'Toronto',          region: 'Americas' },
  { iana: 'America/Bogota',                   label: 'Bogotá',           region: 'Americas' },
  { iana: 'America/Lima',                     label: 'Lima',             region: 'Americas' },
  { iana: 'America/Caracas',                  label: 'Caracas',          region: 'Americas' },
  { iana: 'America/Halifax',                  label: 'Halifax',          region: 'Americas' },
  { iana: 'America/Sao_Paulo',               label: 'São Paulo',        region: 'Americas' },
  { iana: 'America/Argentina/Buenos_Aires',   label: 'Buenos Aires',     region: 'Americas' },
  { iana: 'America/Santiago',                 label: 'Santiago',         region: 'Americas' },
  { iana: 'America/St_Johns',                 label: "St. John's",       region: 'Americas' },
  // UTC
  { iana: 'UTC',                              label: 'UTC',              region: 'UTC' },
  // Europe
  { iana: 'Europe/London',                    label: 'London',           region: 'Europe' },
  { iana: 'Europe/Dublin',                    label: 'Dublin',           region: 'Europe' },
  { iana: 'Europe/Lisbon',                    label: 'Lisbon',           region: 'Europe' },
  { iana: 'Europe/Paris',                     label: 'Paris',            region: 'Europe' },
  { iana: 'Europe/Berlin',                    label: 'Berlin',           region: 'Europe' },
  { iana: 'Europe/Amsterdam',                 label: 'Amsterdam',        region: 'Europe' },
  { iana: 'Europe/Brussels',                  label: 'Brussels',         region: 'Europe' },
  { iana: 'Europe/Zurich',                    label: 'Zurich',           region: 'Europe' },
  { iana: 'Europe/Stockholm',                 label: 'Stockholm',        region: 'Europe' },
  { iana: 'Europe/Oslo',                      label: 'Oslo',             region: 'Europe' },
  { iana: 'Europe/Copenhagen',                label: 'Copenhagen',       region: 'Europe' },
  { iana: 'Europe/Warsaw',                    label: 'Warsaw',           region: 'Europe' },
  { iana: 'Europe/Prague',                    label: 'Prague',           region: 'Europe' },
  { iana: 'Europe/Vienna',                    label: 'Vienna',           region: 'Europe' },
  { iana: 'Europe/Rome',                      label: 'Rome',             region: 'Europe' },
  { iana: 'Europe/Madrid',                    label: 'Madrid',           region: 'Europe' },
  { iana: 'Europe/Athens',                    label: 'Athens',           region: 'Europe' },
  { iana: 'Europe/Bucharest',                 label: 'Bucharest',        region: 'Europe' },
  { iana: 'Europe/Istanbul',                  label: 'Istanbul',         region: 'Europe' },
  { iana: 'Europe/Kiev',                      label: 'Kyiv',             region: 'Europe' },
  { iana: 'Europe/Moscow',                    label: 'Moscow',           region: 'Europe' },
  // Africa
  { iana: 'Africa/Casablanca',                label: 'Casablanca',       region: 'Africa' },
  { iana: 'Africa/Cairo',                     label: 'Cairo',            region: 'Africa' },
  { iana: 'Africa/Lagos',                     label: 'Lagos',            region: 'Africa' },
  { iana: 'Africa/Nairobi',                   label: 'Nairobi',          region: 'Africa' },
  { iana: 'Africa/Johannesburg',              label: 'Johannesburg',     region: 'Africa' },
  { iana: 'Africa/Accra',                     label: 'Accra',            region: 'Africa' },
  { iana: 'Africa/Abidjan',                   label: 'Abidjan',          region: 'Africa' },
  { iana: 'Africa/Addis_Ababa',               label: 'Addis Ababa',      region: 'Africa' },
  // Middle East
  { iana: 'Asia/Riyadh',                      label: 'Riyadh',           region: 'Middle East' },
  { iana: 'Asia/Dubai',                       label: 'Dubai',            region: 'Middle East' },
  { iana: 'Asia/Kuwait',                      label: 'Kuwait City',      region: 'Middle East' },
  { iana: 'Asia/Baghdad',                     label: 'Baghdad',          region: 'Middle East' },
  { iana: 'Asia/Tehran',                      label: 'Tehran',           region: 'Middle East' },
  { iana: 'Asia/Beirut',                      label: 'Beirut',           region: 'Middle East' },
  { iana: 'Asia/Jerusalem',                   label: 'Jerusalem',        region: 'Middle East' },
  // Asia
  { iana: 'Asia/Yekaterinburg',               label: 'Yekaterinburg',    region: 'Asia' },
  { iana: 'Asia/Karachi',                     label: 'Karachi',          region: 'Asia' },
  { iana: 'Asia/Tashkent',                    label: 'Tashkent',         region: 'Asia' },
  { iana: 'Asia/Kolkata',                     label: 'Mumbai / Delhi',   region: 'Asia' },
  { iana: 'Asia/Colombo',                     label: 'Colombo',          region: 'Asia' },
  { iana: 'Asia/Kathmandu',                   label: 'Kathmandu',        region: 'Asia' },
  { iana: 'Asia/Dhaka',                       label: 'Dhaka',            region: 'Asia' },
  { iana: 'Asia/Yangon',                      label: 'Yangon',           region: 'Asia' },
  { iana: 'Asia/Bangkok',                     label: 'Bangkok',          region: 'Asia' },
  { iana: 'Asia/Ho_Chi_Minh',                 label: 'Ho Chi Minh',      region: 'Asia' },
  { iana: 'Asia/Jakarta',                     label: 'Jakarta',          region: 'Asia' },
  { iana: 'Asia/Singapore',                   label: 'Singapore',        region: 'Asia' },
  { iana: 'Asia/Kuala_Lumpur',                label: 'Kuala Lumpur',     region: 'Asia' },
  { iana: 'Asia/Manila',                      label: 'Manila',           region: 'Asia' },
  { iana: 'Asia/Shanghai',                    label: 'Shanghai / Beijing', region: 'Asia' },
  { iana: 'Asia/Hong_Kong',                   label: 'Hong Kong',        region: 'Asia' },
  { iana: 'Asia/Taipei',                      label: 'Taipei',           region: 'Asia' },
  { iana: 'Asia/Seoul',                       label: 'Seoul',            region: 'Asia' },
  { iana: 'Asia/Tokyo',                       label: 'Tokyo',            region: 'Asia' },
  { iana: 'Asia/Vladivostok',                 label: 'Vladivostok',      region: 'Asia' },
  // Oceania
  { iana: 'Australia/Perth',                  label: 'Perth',            region: 'Oceania' },
  { iana: 'Australia/Darwin',                 label: 'Darwin',           region: 'Oceania' },
  { iana: 'Australia/Adelaide',               label: 'Adelaide',         region: 'Oceania' },
  { iana: 'Australia/Brisbane',               label: 'Brisbane',         region: 'Oceania' },
  { iana: 'Australia/Sydney',                 label: 'Sydney',           region: 'Oceania' },
  { iana: 'Australia/Melbourne',              label: 'Melbourne',        region: 'Oceania' },
  { iana: 'Pacific/Auckland',                 label: 'Auckland',         region: 'Oceania' },
  { iana: 'Pacific/Fiji',                     label: 'Fiji',             region: 'Oceania' },
]

const PRESETS: { label: string; zones: string[] }[] = [
  { label: 'US Coasts',     zones: ['America/Los_Angeles', 'America/Chicago', 'America/New_York'] },
  { label: 'US + London',   zones: ['America/Los_Angeles', 'America/New_York', 'Europe/London'] },
  { label: 'US + India',    zones: ['America/Los_Angeles', 'America/New_York', 'Asia/Kolkata'] },
  { label: 'Europe',        zones: ['Europe/London', 'Europe/Paris', 'Europe/Moscow'] },
  { label: 'Asia Pacific',  zones: ['Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'] },
  { label: 'Global',        zones: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalIANA(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
}

function getTZInfo(iana: string): { abbr: string; offsetMinutes: number } {
  try {
    const now = new Date()
    const abbr = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
      .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? iana
    // Calculate UTC offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: iana }))
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000
    return { abbr, offsetMinutes }
  } catch {
    return { abbr: iana, offsetMinutes: 0 }
  }
}

function getHourInTZ(utcHour: number, offsetMinutes: number): number {
  // Given a UTC hour (0-23) and a timezone offset in minutes, return local hour (0-23)
  return ((utcHour * 60 + offsetMinutes) / 60 + 24) % 24
}

function formatHourInTZ(utcHour: number, offsetMinutes: number): string {
  const localHour = getHourInTZ(utcHour, offsetMinutes)
  const h = Math.floor(localHour)
  const ampm = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${ampm}`
}

function formatTimeInTZ(iana: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}

function getOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

function makeTZEntry(iana: string, isLocal = false): TZEntry {
  const found = TIMEZONE_LIST.find(t => t.iana === iana)
  const label = found?.label ?? iana.split('/').pop()?.replace(/_/g, ' ') ?? iana
  const { abbr } = getTZInfo(iana)
  return { id: crypto.randomUUID(), iana, label, abbr, isLocal }
}

// Cell color logic
// For each UTC hour, check how many zones have it in working hours
function getCellColor(utcHour: number, zones: TZEntry[], workStart: number, workEnd: number): 'good' | 'partial' | 'bad' {
  if (zones.length === 0) return 'bad'
  let countWorking = 0
  for (const tz of zones) {
    const { offsetMinutes } = getTZInfo(tz.iana)
    const localHour = getHourInTZ(utcHour, offsetMinutes)
    const h = Math.floor(localHour)
    if (h >= workStart && h < workEnd) countWorking++
  }
  if (countWorking === zones.length) return 'good'
  if (countWorking > 0) return 'partial'
  return 'bad'
}

// ─── Components ───────────────────────────────────────────────────────────────

function SearchDropdown({
  onAdd,
  existingIANAs,
}: {
  onAdd: (iana: string) => void
  existingIANAs: Set<string>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? TIMEZONE_LIST.filter(
        t =>
          !existingIANAs.has(t.iana) &&
          (t.label.toLowerCase().includes(query.toLowerCase()) ||
           t.iana.toLowerCase().includes(query.toLowerCase()) ||
           t.region.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : TIMEZONE_LIST.filter(t => !existingIANAs.has(t.iana)).slice(0, 8)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(iana: string) {
    onAdd(iana)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus-within:border-[var(--color-border-dark)]">
        <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Add timezone…"
          value={query}
          className="flex-1 text-xs bg-transparent outline-none placeholder-[var(--color-ink-muted)]/60 text-[var(--color-ink)] min-w-0"
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-medium)] z-50 overflow-hidden">
          {filtered.map(t => {
            const { abbr, offsetMinutes } = getTZInfo(t.iana)
            return (
              <button
                key={t.iana}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer text-left"
                onMouseDown={() => select(t.iana)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-ink)] font-medium">{t.label}</span>
                  <span className="text-[var(--color-ink-muted)] text-[10px]">{t.region}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-muted)]">
                  <span>{abbr}</span>
                  <span>{getOffsetLabel(offsetMinutes)}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The 24-hour grid for a single timezone row
function TZRow({
  tz,
  pinnedHour,
  selectedRange,
  onHover,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onRemove,
  workStart,
  workEnd,
  allZones,
  isDragging,
  isLocal,
  currentHour,
}: {
  tz: TZEntry
  pinnedHour: number | null
  selectedRange: [number, number] | null
  onHover: (hour: number | null) => void
  onMouseDown: (hour: number) => void
  onMouseEnter: (hour: number) => void
  onMouseUp: () => void
  onRemove: () => void
  workStart: number
  workEnd: number
  allZones: TZEntry[]
  isDragging: boolean
  isLocal: boolean
  currentHour: number   // UTC current hour
}) {
  const { offsetMinutes } = getTZInfo(tz.iana)
  const currentTime = formatTimeInTZ(tz.iana)

  const rangeMin = selectedRange ? Math.min(selectedRange[0], selectedRange[1]) : -1
  const rangeMax = selectedRange ? Math.max(selectedRange[0], selectedRange[1]) : -1

  return (
    <div className="flex items-stretch group border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-cream)] transition-colors">
      {/* Label */}
      <div className="w-40 shrink-0 flex items-center gap-2 px-3 py-2 border-r border-[var(--color-border)]">
        <div className="relative w-4 h-4 shrink-0">
          {/* YOU badge — hidden on hover */}
          {isLocal && (
            <div className="absolute inset-0 rounded-full bg-[var(--color-accent)] flex items-center justify-center group-hover:opacity-0 transition-opacity">
              <span className="text-[6px] text-white font-bold">YOU</span>
            </div>
          )}
          {/* Remove button — shown on hover for all rows */}
          <button
            onClick={onRemove}
            className={`absolute inset-0 rounded flex items-center justify-center text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer transition-opacity ${
              isLocal ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--color-ink)] truncate leading-tight">{tz.label}</div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--color-ink-muted)]">{tz.abbr}</span>
            <span className="text-[9px] text-[var(--color-ink-muted)]/60">·</span>
            <span className="text-[9px] text-[var(--color-ink-muted)] tabular-nums">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Grid cells */}
      <div
        className="flex flex-1 select-none"
        onMouseLeave={() => onHover(null)}
      >
        {Array.from({ length: 24 }, (_, utcHour) => {
          const localH = getHourInTZ(utcHour, offsetMinutes)
          const h = Math.floor(localH)
          const isWork = h >= workStart && h < workEnd
          const cellColor = getCellColor(utcHour, allZones, workStart, workEnd)
          const isPinned = pinnedHour === utcHour
          const inRange = selectedRange !== null && utcHour >= rangeMin && utcHour <= rangeMax
          const isNow = utcHour === currentHour

          const bg = inRange
            ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/40'
            : isPinned
            ? 'bg-[var(--color-ink)]/8'
            : cellColor === 'good'
            ? 'bg-[var(--color-success-bg-subtle)]'
            : cellColor === 'partial'
            ? 'bg-[var(--color-warning-bg-subtle)]'
            : 'bg-white'

          const borderColor = isNow
            ? 'border-l border-[var(--color-accent)]/80'
            : 'border-l border-[var(--color-border)]/50'

          return (
            <div
              key={utcHour}
              className={`relative flex-1 flex items-center justify-center cursor-pointer transition-colors ${bg} ${borderColor} first:border-l-0`}
              style={{ minWidth: 0 }}
              onMouseEnter={() => { onHover(utcHour); if (isDragging) onMouseEnter(utcHour) }}
              onMouseDown={() => onMouseDown(utcHour)}
              onMouseUp={onMouseUp}
            >
              {/* Work hours indicator bar */}
              {isWork && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-t ${
                    cellColor === 'good' ? 'bg-[var(--color-success-icon)]' : cellColor === 'partial' ? 'bg-[var(--color-warning-icon)]' : 'bg-[var(--color-border-dark)]'
                  }`}
                />
              )}
              {/* Now indicator */}
              {isNow && (
                <div className="absolute inset-y-0 left-0 w-px bg-[var(--color-accent)] z-10" />
              )}
              {/* Pinned vertical line */}
              {isPinned && !inRange && (
                <div className="absolute inset-0 ring-1 ring-inset ring-[var(--color-ink)]/15 pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimezonePlanner() {
  const localIANA = getLocalIANA()
  const [zones, setZones] = useState<TZEntry[]>(() => [makeTZEntry(localIANA, true)])
  const [pinnedHour, setPinnedHour] = useState<number | null>(null)
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [workStart, setWorkStart] = useState(9)
  const [workEnd, setWorkEnd] = useState(18)
  const [showWorkSettings, setShowWorkSettings] = useState(false)
  const [currentUTCHour, setCurrentUTCHour] = useState(() => new Date().getUTCHours())
  const [showAddPreset, setShowAddPreset] = useState(false)
  const presetsRef = useRef<HTMLDivElement>(null)

  // Tick every minute to keep "now" indicator fresh
  useEffect(() => {
    const tick = () => setCurrentUTCHour(new Date().getUTCHours())
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Close presets on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) setShowAddPreset(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Global mouseup to end drag
  useEffect(() => {
    function handler() {
      if (isDragging) {
        setIsDragging(false)
      }
    }
    window.addEventListener('mouseup', handler)
    return () => window.removeEventListener('mouseup', handler)
  }, [isDragging])

  const existingIANAs = new Set(zones.map(z => z.iana))

  function addZone(iana: string) {
    if (existingIANAs.has(iana)) return
    setZones(prev => [...prev, makeTZEntry(iana, iana === localIANA)])
  }

  function removeZone(id: string) {
    setZones(prev => {
      const next = prev.filter(z => z.id !== id)
      return next.length === 0 ? [makeTZEntry(localIANA, true)] : next
    })
    setSelectedRange(null)
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    const newZones: TZEntry[] = [makeTZEntry(localIANA, true)]
    for (const iana of preset.zones) {
      if (iana !== localIANA) newZones.push(makeTZEntry(iana))
    }
    setZones(newZones)
    setSelectedRange(null)
    setShowAddPreset(false)
  }

  function handleMouseDown(utcHour: number) {
    setIsDragging(true)
    setDragStart(utcHour)
    setSelectedRange([utcHour, utcHour])
  }

  function handleMouseEnter(utcHour: number) {
    if (isDragging && dragStart !== null) {
      setSelectedRange([dragStart, utcHour])
    }
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  // Selected range summary
  const rangeMin = selectedRange ? Math.min(selectedRange[0], selectedRange[1]) : -1
  const rangeMax = selectedRange ? Math.max(selectedRange[0], selectedRange[1]) : -1
  const rangeLength = selectedRange ? rangeMax - rangeMin + 1 : 0

  function getRangeSummary(): { working: number; partial: number; label: string } | null {
    if (!selectedRange) return null
    let working = 0, partial = 0
    for (let h = rangeMin; h <= rangeMax; h++) {
      const color = getCellColor(h, zones, workStart, workEnd)
      if (color === 'good') working++
      else if (color === 'partial') partial++
    }
    // Format label: use first zone as reference display
    const firstZone = zones[0]
    if (!firstZone) return { working, partial, label: '' }
    const { offsetMinutes } = getTZInfo(firstZone.iana)
    const startLocal = formatHourInTZ(rangeMin, offsetMinutes)
    const endLocal = formatHourInTZ(rangeMax + 1, offsetMinutes)
    return { working, partial, label: `${startLocal}–${endLocal} ${firstZone.abbr}` }
  }

  const summary = getRangeSummary()

  // Build copy string for selected range
  function buildCopyText(): string {
    if (!selectedRange) return ''
    const lines: string[] = [`Meeting slot: ${rangeLength}h block`]
    for (const tz of zones) {
      const { offsetMinutes } = getTZInfo(tz.iana)
      const start = formatHourInTZ(rangeMin, offsetMinutes)
      const end = formatHourInTZ(rangeMax + 1, offsetMinutes)
      lines.push(`  ${tz.label} (${tz.abbr}): ${start} – ${end}`)
    }
    return lines.join('\n')
  }

  // Hour axis labels (UTC hours 0-23, shown at key positions)
  const AXIS_LABELS = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div className="space-y-3 animate-fade-in">
      <ToolHeader icon={<Globe />} title="Meeting" accentedSuffix="Planner" />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Add timezone search */}
        <div className="w-52">
          <SearchDropdown onAdd={addZone} existingIANAs={existingIANAs} />
        </div>

        {/* Presets */}
        <div ref={presetsRef} className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddPreset(v => !v)}
            className="gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Presets
            <ChevronDown className={`w-3 h-3 transition-transform ${showAddPreset ? 'rotate-180' : ''}`} />
          </Button>
          {showAddPreset && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-medium)] z-50 overflow-hidden min-w-[160px]">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer text-[var(--color-ink)]"
                >
                  {p.label}
                  <span className="text-[var(--color-ink-muted)] ml-1 text-[9px]">({p.zones.length} zones)</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Working hours */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowWorkSettings(v => !v)}
            className="gap-1"
          >
            <CalendarClock className="w-3 h-3" />
            Work hours: {formatHour(workStart)}–{formatHour(workEnd)}
          </Button>
          {showWorkSettings && (
            <WorkHoursPanel
              workStart={workStart}
              workEnd={workEnd}
              onChange={(s, e) => { setWorkStart(s); setWorkEnd(e) }}
              onClose={() => setShowWorkSettings(false)}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          <LegendDot color="bg-[var(--color-success-icon)]" label="All working" />
          <LegendDot color="bg-[var(--color-warning-icon)]" label="Some working" />
          <LegendDot color="bg-[var(--color-border-dark)]" label="Off hours" />
        </div>
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        {/* UTC axis header */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-cream-dark)]">
          <div className="w-40 shrink-0 px-3 py-1.5 border-r border-[var(--color-border)]">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Timezone</span>
          </div>
          <div className="flex flex-1">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className={`flex-1 flex items-center justify-center py-1 border-l border-[var(--color-border)]/50 first:border-l-0 ${
                  i === currentUTCHour ? 'bg-[var(--color-accent)]/8' : ''
                }`}
              >
                {AXIS_LABELS.includes(i) && (
                  <span className={`text-[8px] font-mono tabular-nums select-none ${
                    i === currentUTCHour ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]/70'
                  }`}>
                    {i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* UTC label */}
        <div className="flex">
          <div className="w-40 shrink-0 px-3 py-0.5 border-r border-[var(--color-border)] bg-[var(--color-cream-dark)]/50">
            <span className="text-[8px] text-[var(--color-ink-muted)]/50 font-mono">UTC</span>
          </div>
          <div className="flex-1" />
        </div>

        {/* Zone rows */}
        {zones.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-ink-muted)]">
            Add a timezone to get started
          </div>
        ) : (
          zones.map(tz => (
            <TZRow
              key={tz.id}
              tz={tz}
              pinnedHour={pinnedHour}
              selectedRange={selectedRange}
              onHover={setPinnedHour}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseUp={handleMouseUp}
              onRemove={() => removeZone(tz.id)}
              workStart={workStart}
              workEnd={workEnd}
              allZones={zones}
              isDragging={isDragging}
              isLocal={tz.isLocal}
              currentHour={currentUTCHour}
            />
          ))
        )}

        {/* Pinned hover tooltip bar */}
        {pinnedHour !== null && !isDragging && (
          <div className="px-3 py-1.5 bg-[var(--color-ink)] text-[var(--color-cream)] text-[10px] font-mono flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-[var(--color-accent)]">
              {pinnedHour === 0 ? '12 AM' : pinnedHour < 12 ? `${pinnedHour} AM` : pinnedHour === 12 ? '12 PM' : `${pinnedHour - 12} PM`} UTC
            </span>
            {zones.map(tz => {
              const { offsetMinutes } = getTZInfo(tz.iana)
              return (
                <span key={tz.id} className="text-[var(--color-cream)]/70">
                  {tz.label}: <span className="text-[var(--color-cream)] tabular-nums">{formatHourInTZ(pinnedHour, offsetMinutes)}</span>
                </span>
              )
            })}
          </div>
        )}
      </Card>

      {/* Selection result card */}
      {selectedRange && summary && (
        <Card className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
          <div className="px-3 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-xs font-semibold text-[var(--color-ink)]">{rangeLength}h slot selected</span>
              </div>
              <div className="flex items-center gap-2">
                {summary.working === rangeLength ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--color-success-bg)] text-[var(--color-success-text)] px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-icon)] inline-block" />
                    Works for all {zones.length} zones
                  </span>
                ) : summary.partial > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-icon)] inline-block" />
                    Partial overlap
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--color-error-bg)] text-[var(--color-error-text)] px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error-icon)] inline-block" />
                    Outside work hours
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Per-zone times */}
              <div className="flex items-center gap-3 flex-wrap">
                {zones.map(tz => {
                  const { offsetMinutes } = getTZInfo(tz.iana)
                  const start = formatHourInTZ(rangeMin, offsetMinutes)
                  const end = formatHourInTZ(rangeMax + 1, offsetMinutes)
                  return (
                    <div key={tz.id} className="text-[10px]">
                      <span className="text-[var(--color-ink-muted)]">{tz.label}: </span>
                      <span className="text-[var(--color-ink)] font-mono tabular-nums font-medium">{start}–{end}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <CopyButton text={buildCopyText()} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRange(null)}
                  className="!py-1 !px-1.5"
                >
                  <XIcon className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Drag hint */}
      {!selectedRange && zones.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--color-cream-dark)] rounded border border-[var(--color-border)] text-[10px] text-[var(--color-ink-muted)]">
          <MousePointer2 className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
          <span>Hover to see times across all zones · Click and drag to select a meeting slot</span>
        </div>
      )}
    </div>
  )
}

// ─── Work Hours Panel ─────────────────────────────────────────────────────────

function WorkHoursPanel({
  workStart,
  workEnd,
  onChange,
  onClose,
}: {
  workStart: number
  workEnd: number
  onChange: (start: number, end: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 left-0 bg-white border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-medium)] z-50 p-3 min-w-[200px]"
    >
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Working Hours</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[10px] text-[var(--color-ink)] w-10">Start</label>
          <select
            value={workStart}
            onChange={e => onChange(parseInt(e.target.value), workEnd)}
            className="flex-1 text-xs bg-white border border-[var(--color-border)] rounded px-1.5 py-1 text-[var(--color-ink)] cursor-pointer focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-[10px] text-[var(--color-ink)] w-10">End</label>
          <select
            value={workEnd}
            onChange={e => onChange(workStart, parseInt(e.target.value))}
            className="flex-1 text-xs bg-white border border-[var(--color-border)] rounded px-1.5 py-1 text-[var(--color-ink)] cursor-pointer focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex gap-1.5">
        {[
          { label: '9–5', s: 9, e: 17 },
          { label: '9–6', s: 9, e: 18 },
          { label: '10–7', s: 10, e: 19 },
        ].map(p => (
          <button
            key={p.label}
            onClick={() => onChange(p.s, p.e)}
            className={`px-2 py-0.5 text-[9px] rounded border cursor-pointer transition-colors ${
              workStart === p.s && workEnd === p.e
                ? 'bg-[var(--color-ink)] text-[var(--color-cream)] border-[var(--color-ink)]'
                : 'bg-white text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-border-dark)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-sm ${color}`} />
      <span className="text-[10px] text-[var(--color-ink-muted)]">{label}</span>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

