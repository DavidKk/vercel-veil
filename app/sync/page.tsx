import { checkAccess } from '@/services/auth/access'

import SyncContent from './SyncContent'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

export default async function SyncPage() {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/sync' })

  return <SyncContent />
}
