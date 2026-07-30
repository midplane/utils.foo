import { SectionLabel } from '../../../components/ui/SectionLabel'
import {
  NUMBER_STYLE_LABELS,
  PALETTE_LABELS,
  type Cosmetics,
  type NumberStyle,
  type PaletteName,
} from '../chartOption'

interface StylePanelProps {
  cosmetics: Cosmetics
  usesRightAxis: boolean
  supportsAxes: boolean
  onChange: (patch: Partial<Cosmetics>) => void
}

const inputClass =
  'w-full text-[11px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]'

const selectClass = `${inputClass} cursor-pointer`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  )
}

function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-ink-light)] cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--color-accent)] cursor-pointer"
      />
      {label}
    </label>
  )
}

export function StylePanel({ cosmetics: c, usesRightAxis, supportsAxes, onChange }: StylePanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Field label="Title">
          <input
            value={c.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Chart title"
            className={inputClass}
          />
        </Field>
        <Field label="Subtitle">
          <input
            value={c.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Optional subtitle"
            className={inputClass}
          />
        </Field>
      </div>

      {supportsAxes && (
        <>
          <div className="space-y-2.5">
            <Field label="X axis label">
              <input
                value={c.xLabel}
                onChange={(e) => onChange({ xLabel: e.target.value })}
                placeholder="auto"
                className={inputClass}
              />
            </Field>
            <Field label="Y axis label">
              <input
                value={c.yLabel}
                onChange={(e) => onChange({ yLabel: e.target.value })}
                placeholder="auto"
                className={inputClass}
              />
            </Field>
            {usesRightAxis && (
              <Field label="Right Y label">
                <input
                  value={c.yRightLabel}
                  onChange={(e) => onChange({ yRightLabel: e.target.value })}
                  placeholder="auto"
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Scale">
              <select
                value={c.scale}
                onChange={(e) => onChange({ scale: e.target.value as Cosmetics['scale'] })}
                className={selectClass}
              >
                <option value="linear">Linear</option>
                <option value="log">Logarithmic</option>
              </select>
            </Field>
            <Field label="Y min">
              <input
                value={c.min}
                onChange={(e) => onChange({ min: e.target.value })}
                placeholder="auto"
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
            <Field label="Y max">
              <input
                value={c.max}
                onChange={(e) => onChange({ max: e.target.value })}
                placeholder="auto"
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
            <Field label="Decimals">
              <input
                value={c.decimals ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim()
                  onChange({ decimals: raw === '' ? null : Math.max(0, Math.min(6, Number(raw) || 0)) })
                }}
                placeholder="auto"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
          </div>
        </>
      )}

      <div className="space-y-2.5">
        <Field label="Number format">
          <select
            value={c.numberStyle}
            onChange={(e) => onChange({ numberStyle: e.target.value as NumberStyle })}
            className={selectClass}
          >
            {(Object.keys(NUMBER_STYLE_LABELS) as NumberStyle[]).map((s) => (
              <option key={s} value={s}>{NUMBER_STYLE_LABELS[s]}</option>
            ))}
          </select>
        </Field>

        {c.numberStyle === 'currency' && (
          <Field label="Currency symbol">
            <input
              value={c.currencySymbol}
              onChange={(e) => onChange({ currencySymbol: e.target.value.slice(0, 3) })}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Palette">
          <select
            value={c.palette}
            onChange={(e) => onChange({ palette: e.target.value as PaletteName })}
            className={selectClass}
          >
            {(Object.keys(PALETTE_LABELS) as PaletteName[]).map((p) => (
              <option key={p} value={p}>{PALETTE_LABELS[p]}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Toggle label="Legend" value={c.showLegend} onChange={(v) => onChange({ showLegend: v })} />
        {supportsAxes && (
          <Toggle label="Grid lines" value={c.showGrid} onChange={(v) => onChange({ showGrid: v })} />
        )}
        <Toggle
          label="Data labels"
          value={c.showDataLabels}
          onChange={(v) => onChange({ showDataLabels: v })}
        />
        {supportsAxes && (
          <Toggle label="Smooth lines" value={c.smooth} onChange={(v) => onChange({ smooth: v })} />
        )}
      </div>
    </div>
  )
}
