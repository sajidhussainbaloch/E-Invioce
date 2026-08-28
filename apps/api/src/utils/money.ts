export const rupeesToPaisa = (amount: number): number => Math.round(amount * 100);

export const paisaToRupees = (paisa: number): number => paisa / 100;

export function formatRs(paisa: number): string {
  const rupees = paisa / 100;
  return `Rs. ${rupees.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const taxPaisa = (amountPaisa: number, rateBp: number): number =>
  Math.round((amountPaisa * rateBp) / 10000);