export type InvoiceItemRow = {
  id: string;
  invoiceId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPricePaisa: number;
  taxRateBp: number;
  amountPaisa: number;
  hsCode?: string | null;
  unit?: string | null;
};