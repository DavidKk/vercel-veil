import { checkAccess } from '@/services/auth/access'

import DoubanTest from './DoubanTest'

export default async function DoubanFeedPage() {
  await checkAccess({ isApiRouter: false })
  return <DoubanTest />
}
