export const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export interface CronField {
  raw: string
  description: string
  valid: boolean
  error?: string
}

export interface ParsedCron {
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

export function parseField(
  value: string,
  min: number,
  max: number,
  names?: string[]
): CronField {
  const raw = value

  let v = value.toLowerCase()
  if (names) {
    names.forEach((name, idx) => {
      v = v.replace(new RegExp(name.toLowerCase(), 'g'), String(idx))
    })
  }

  if (v === '*') return { raw, description: 'every', valid: true }

  const stepMatch = v.match(/^(\*|\d+)\/(\d+)$/)
  if (stepMatch) {
    const step = parseInt(stepMatch[2]!)
    const start = stepMatch[1] === '*' ? min : parseInt(stepMatch[1]!)
    if (isNaN(step) || step < 1) return { raw, description: '', valid: false, error: `Invalid step` }
    const label = names ? (names[start] ?? String(start)) : String(start)
    return { raw, description: `every ${step} (starting at ${label})`, valid: true }
  }

  if (v.includes(',')) {
    const parts = v.split(',')
    const nums = parts.map(p => parseInt(p))
    if (nums.some(n => isNaN(n) || n < min || n > max)) {
      return { raw, description: '', valid: false, error: `Value out of range (${min}-${max})` }
    }
    const labels = nums.map(n => names ? (names[n] ?? String(n)) : String(n))
    return { raw, description: labels.join(', '), valid: true }
  }

  if (v.includes('-')) {
    const [a, b] = v.split('-').map(p => parseInt(p))
    if (isNaN(a!) || isNaN(b!) || a! < min || b! > max || a! > b!) {
      return { raw, description: '', valid: false, error: `Invalid range (${min}-${max})` }
    }
    const la = names ? (names[a!] ?? String(a)) : String(a)
    const lb = names ? (names[b!] ?? String(b)) : String(b)
    return { raw, description: `${la} through ${lb}`, valid: true }
  }

  const n = parseInt(v)
  if (isNaN(n) || n < min || n > max) {
    return { raw, description: '', valid: false, error: `Value out of range (${min}-${max})` }
  }
  const label = names ? (names[n] ?? String(n)) : String(n)
  return { raw, description: label, valid: true }
}

export function matchesField(value: number, expr: string, min: number, max: number): boolean {
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
  return value === n || (max === 7 && n === 7 && value === 0)
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

export function computeNextDates(parts: [string,string,string,string,string], count: number): Date[] {
  const [mExpr, hExpr, domExpr, monthExpr, dowExpr] = parts
  const results: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)

  const limit = 200000
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

export function parseCron(expr: string): ParsedCron {
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

  const nextDates = computeNextDates(parts as [string,string,string,string,string], 5)

  return { valid: true, description, fields, nextDates }
}
