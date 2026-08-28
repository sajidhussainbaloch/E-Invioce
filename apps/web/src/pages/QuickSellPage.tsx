import { useNavigate } from 'react-router'
import { QuickSellModal } from '../components/QuickSellModal'

export function QuickSellPage() {
  const navigate = useNavigate()
  return <QuickSellModal onClose={() => navigate('/invoices')} />
}