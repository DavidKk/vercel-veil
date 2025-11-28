import { checkAccess } from '@/services/auth/access'

import TasiTest from './TasiTest'

export default async function TasiFinancePage() {
  await checkAccess({ isApiRouter: false })
  return <TasiTest />
}
