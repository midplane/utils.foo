import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { Badge } from '../../components/ui/Badge'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { cn } from '../../lib/utils'
import {
  ImageIcon, Upload, Camera, MapPin, Settings2, Info, X,
  Aperture, Clock, Sun, Zap, Ruler, Palette, FileImage,
} from 'lucide-react'
import {
  parseExif, formatExifValue, getGpsCoordinates, formatDms,
  type ParsedExif, type ExifData,
} from './logic'

// ─── Highlight cards for key camera settings ─────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--color-cream-dark)] border border-[var(--color-border)]">
      <div className="text-[var(--color-accent)] [&>svg]:w-4 [&>svg]:h-4 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wider">{label}</div>
        <div className="text-sm font-mono font-semibold text-[var(--color-ink)] truncate">{value}</div>
      </div>
    </div>
  )
}

// ─── Tag table section ───────────────────────────────────────────────────────

interface TagSectionProps {
  title: string
  icon: React.ReactNode
  data: ExifData
  defaultOpen?: boolean
}

function TagSection({ title, icon, data, defaultOpen = true }: TagSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full text-left"
        >
          <div className="text-[var(--color-accent)] [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div>
          <span className="text-xs font-semibold text-[var(--color-ink)] flex-1">{title}</span>
          <Badge variant="accent">{entries.length}</Badge>
          <svg
            className={cn('w-3.5 h-3.5 text-[var(--color-ink-muted)] transition-transform', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div className="divide-y divide-[var(--color-border)]">
            {entries.map(([key, value]) => {
              const formatted = formatExifValue(key, value as string | number | number[])
              return (
                <div key={key} className="flex items-center justify-between gap-4 py-1.5">
                  <span className="text-xs text-[var(--color-ink-muted)] shrink-0">{key}</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono text-[var(--color-ink)] truncate">{formatted}</span>
                    <CopyButton text={formatted} className="shrink-0 !h-5 !w-5 !p-0 [&>svg]:!w-2.5 [&>svg]:!h-2.5" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── GPS Map Link ────────────────────────────────────────────────────────────

function GpsCard({ gps }: { gps: ExifData }) {
  const coords = getGpsCoordinates(gps)
  if (!coords) return null

  const latDms = formatDms(gps.GPSLatitude as number[], gps.GPSLatitudeRef as string)
  const lngDms = formatDms(gps.GPSLongitude as number[], gps.GPSLongitudeRef as string)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="text-[var(--color-accent)] [&>svg]:w-3.5 [&>svg]:h-3.5"><MapPin /></div>
          <span className="text-xs font-semibold text-[var(--color-ink)]">GPS Location</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--color-ink-muted)]">Latitude</div>
            <div className="text-sm font-mono text-[var(--color-ink)]">{latDms}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-ink-muted)]">Longitude</div>
            <div className="text-sm font-mono text-[var(--color-ink)]">{lngDms}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)] font-mono">
          <span>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
          <CopyButton text={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`} />
        </div>
        {gps.GPSAltitude !== undefined && (
          <div className="text-xs text-[var(--color-ink-muted)]">
            Altitude: <span className="font-mono text-[var(--color-ink)]">{formatExifValue('GPSAltitude', gps.GPSAltitude as number)}</span>
            {gps.GPSAltitudeRef === 1 && ' (below sea level)'}
          </div>
        )}
        <a
          href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat.toFixed(6)}/${coords.lng.toFixed(6)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
        >
          <MapPin className="w-3 h-3" />
          View on OpenStreetMap
        </a>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExifViewerTool() {
  const [exif, setExif] = useState<ParsedExif | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadIdRef = useRef(0)

  const processFile = useCallback((file: File) => {
    setError('')
    setExif(null)
    setPreview(null)

    if (!file.type.match(/^image\/(jpeg|tiff)/) && !file.name.match(/\.(jpe?g|tiff?)$/i)) {
      setError('Only JPEG and TIFF files contain EXIF data. Please try a photo from a camera.')
      return
    }

    const currentLoadId = ++loadIdRef.current

    setFileName(file.name)
    setFileSize(file.size)

    // Create preview
    const previewReader = new FileReader()
    previewReader.onload = () => {
      if (loadIdRef.current !== currentLoadId) return
      setPreview(previewReader.result as string)
    }
    previewReader.readAsDataURL(file)

    // Parse EXIF
    const reader = new FileReader()
    reader.onload = () => {
      if (loadIdRef.current !== currentLoadId) return
      const result = parseExif(reader.result as ArrayBuffer)
      if (!result) {
        setError('No EXIF data found in this image. The metadata may have been stripped.')
        return
      }
      const hasData = Object.keys(result.image).length > 0 ||
                      Object.keys(result.exif).length > 0 ||
                      Object.keys(result.gps).length > 0
      if (!hasData) {
        setError('No EXIF data found in this image. The metadata may have been stripped.')
        return
      }
      setExif(result)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClear = useCallback(() => {
    setExif(null)
    setPreview(null)
    setFileName('')
    setFileSize(0)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Extract highlight values
  const camera = exif ? [exif.image.Make, exif.image.Model].filter(Boolean).join(' ') : ''
  const lens = exif?.exif.LensModel as string | undefined
  const exposure = exif?.exif.ExposureTime != null ? formatExifValue('ExposureTime', exif.exif.ExposureTime as number) : ''
  const fNumber = exif?.exif.FNumber != null ? formatExifValue('FNumber', exif.exif.FNumber as number) : ''
  const iso = exif?.exif.ISOSpeedRatings != null ? `ISO ${exif.exif.ISOSpeedRatings}` : ''
  const focalLength = exif?.exif.FocalLength != null ? formatExifValue('FocalLength', exif.exif.FocalLength as number) : ''

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<ImageIcon />} title="EXIF" accentedSuffix="Viewer" />

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              isDragging
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-cream-dark)]',
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)]',
            )}>
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Drop an image here or <span className="text-[var(--color-accent)]">browse</span>
              </p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                Supports JPEG and TIFF files with EXIF metadata
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/tiff,.jpg,.jpeg,.tif,.tiff"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) processFile(file)
              }}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-[var(--color-error-text)]">
              <Info className="w-4 h-4 shrink-0" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview + highlights */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                <FileImage className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span className="text-xs font-semibold text-[var(--color-ink)] truncate">{fileName}</span>
                <Badge>{formatSize(fileSize)}</Badge>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleClear() }}
                className="p-1 rounded-md hover:bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-ink)]/5">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      {exif && (camera || lens || exposure || fNumber || iso || focalLength) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {camera && <StatCard icon={<Camera />} label="Camera" value={camera} />}
          {lens && <StatCard icon={<Ruler />} label="Lens" value={lens} />}
          {fNumber && <StatCard icon={<Aperture />} label="Aperture" value={fNumber} />}
          {exposure && <StatCard icon={<Clock />} label="Shutter" value={exposure} />}
          {iso && <StatCard icon={<Sun />} label="ISO" value={iso} />}
          {focalLength && <StatCard icon={<Zap />} label="Focal Length" value={focalLength} />}
        </div>
      )}

      {/* GPS */}
      {exif && Object.keys(exif.gps).length > 0 && <GpsCard gps={exif.gps} />}

      {/* Full tag sections */}
      {exif && (
        <>
          <TagSection title="Image Info" icon={<FileImage />} data={exif.image} />
          <TagSection title="Camera & Exposure" icon={<Settings2 />} data={exif.exif} />
          {Object.keys(exif.gps).length > 0 && (
            <TagSection title="GPS Data" icon={<MapPin />} data={exif.gps} defaultOpen={false} />
          )}
        </>
      )}

      {/* Info cards */}
      {!exif && !error && (
        <div className="grid grid-cols-2 gap-2">
          <InfoCard
            icon={<Info className="text-[var(--color-accent)]" />}
            title="100% Private"
            description="Images are processed entirely in your browser. Nothing is uploaded."
          />
          <InfoCard
            icon={<Palette className="text-[var(--color-success-icon)]" />}
            title="Camera metadata"
            description="View camera model, lens, exposure, GPS location, and more."
          />
        </div>
      )}
    </div>
  )
}
