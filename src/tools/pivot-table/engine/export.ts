/** Shared delimited-text escaping, so every export path agrees. */

/** Tabs and newlines would corrupt the column structure of pasted output. */
export function escapeTsv(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ')
}

export function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Save CSV text as a file. The BOM keeps Excel from misreading UTF-8. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoking synchronously can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
