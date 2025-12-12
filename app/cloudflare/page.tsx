import { checkAccess } from '@/services/auth/access'

import CloudflareCheck from './CloudflareCheck'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

export default async function CloudflarePage() {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/cloudflare' })

  return <CloudflareCheck />
}
