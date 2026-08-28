export type User = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Business = {
  id: string
  name: string
  ntn: string | null
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
  invoicePrefix: string
  fbrEnvironment: string
  updatedAt: string
}

export type MeResponse = {
  user: User
  business: (Business & { settings: BusinessSettings | null }) | null
  hasBusiness: boolean
}

export type DashboardResponse = {
  business: Business
  invoices: number
  customers: number
  products: number
  salesToday: number
  fbrConnected: boolean
  lastFbrSubmission: string | null
  generatedAt: string
}