export type User = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Business = {
  id: string
  name: string
  taxpayerType: 'individual' | 'company'
  ntn: string | null
  salesTaxRegistered: boolean
  taxRegistration: string | null
  address: string | null
  phone: string | null
  email: string | null
  logoPath: string | null
  createdAt: string
  updatedAt: string
}

export type BusinessSettings = {
  id: string
  businessId: string
  watermarkEnabled: boolean
  watermarkMode: 'text' | 'logo'
  watermarkText: string
  invoicePrefix: string
  fbrEnvironment: string
  fbrProvince: string | null
  hasFbrSandboxToken: boolean
  hasFbrProductionToken: boolean
  updatedAt: string
}

export type MeResponse = {
  user: User
  business: (Business & { settings: BusinessSettings | null }) | null
  hasBusiness: boolean
}

export type DashboardLastFbr = {
  invoiceNumber: string
  status: string
  fbrNumber: string | null
  errorMessage: string | null
  createdAt: string
}

export type DashboardResponse = {
  business: Business
  invoices: number
  customers: number
  products: number
  invoiceLines: number
  salesToday: number
  recentInvoices: InvoiceListItem[]
  fbrConnected: boolean
  fbrEnvironment: string | null
  pendingFbrSubmissions: number
  lastFbrSubmission: DashboardLastFbr | null
  generatedAt: string
}

export type Customer = {
  id: string
  name: string
  ntn: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerInput = {
  name: string
  ntn?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export type Product = {
  id: string
  name: string
  sku: string
  barcode: string | null
  unit: string
  pricePaisa: number
  hsCode: string | null
  taxRateBp: number
  createdAt: string
  updatedAt: string
}

export type ProductInput = {
  name: string
  sku: string
  barcode?: string
  unit: string
  price: number
  hsCode?: string
  taxRateBp?: number
}

export type Invoice = {
  id: string
  customerId: string
  number: string | null
  issueDate: string | null
  status: 'draft' | 'issued'
  discountPaisa: number
  subtotalPaisa: number
  taxablePaisa: number
  taxPaisa: number
  totalPaisa: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type InvoiceListItem = {
  id: string
  number: string | null
  status: 'draft' | 'issued'
  issueDate: string | null
  createdAt: string
  totalPaisa: number
  customerName: string
}

export type InvoiceItem = {
  id: string
  invoiceId: string
  productId: string | null
  description: string
  quantity: number
  unitPricePaisa: number
  taxRateBp: number
  amountPaisa: number
}

export type InvoiceDetail = {
  invoice: Invoice
  customer: Customer | null
  items: InvoiceItem[]
}

export type InvoiceLineInput = {
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  taxRateBp: number
}

export type InvoiceInput = {
  customerId: string
  discount: number
  notes?: string
  items: InvoiceLineInput[]
}

export type FbrStatusResponse = {
  status: {
    environment: string
    province: string | null
    hasSandboxToken: boolean
    hasProductionToken: boolean
  } | null
  business: { name: string; hasNtn: boolean; ntn: string | null }
  lastSubmission: {
    id: string
    invoiceNumber: string
    status: string
    fbrNumber: string | null
    errorMessage: string | null
    submittedAt: string | null
    createdAt: string
  } | null
  pendingCount: number
}

export type FbrSubmissionRecord = {
  id: string
  invoiceId: string
  invoiceNumber: string
  status: string
  attempts: number
  environment: string
  fbrNumber: string | null
  errorMessage: string | null
  submittedAt: string | null
  createdAt: string
}

export type FbrSubmissionsResponse = {
  submissions: FbrSubmissionRecord[]
}

export type FbrRetryResponse = {
  ok: boolean
  status: string
  message: string
  fbrNumber: string | null
}

export type ReportsSalesResponse = {
  summary: {
    count: number
    revenuePaisa: number
    taxPaisa: number
    discountPaisa: number
  }
  byItem: Array<{
    description: string
    quantity: number
    amountPaisa: number
    taxRateBp: number
  }>
  rows: Array<{
    id: string
    number: string | null
    issueDate: string | null
    totalPaisa: number
    taxPaisa: number
    fbrNumber: string | null
    fbrStatus: string | null
    customerName: string
  }>
  from: string | null
  to: string | null
}