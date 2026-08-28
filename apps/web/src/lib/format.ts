export function fmtPaisa(paisa: number): string {
  const rupees = paisa / 100
  return `Rs. ${rupees.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function paisaToRupees(paisa: number): number {
  return paisa / 100
}

export function taxPercent(bp: number): number {
  return bp / 100
}