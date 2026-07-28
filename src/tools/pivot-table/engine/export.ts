/** Shared delimited-text escaping, so every export path agrees. */

/** Tabs and newlines would corrupt the column structure of pasted output. */
export function escapeTsv(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ')
}

export function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
