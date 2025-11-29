import { checkAccess } from '@/services/auth/access'

import MusicTest from './MusicTest'

export default async function MusicPage() {
  await checkAccess({ isApiRouter: false })
  return <MusicTest />
}
