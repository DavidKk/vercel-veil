import { checkAccess } from '@/services/auth/access'
import { listTemplates } from '@/services/templates/registry'

import { Prview } from './Prview'

export default async function EmailPage() {
  await checkAccess({ isApiRouter: false })
  const templates = listTemplates()

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] overflow-hidden">
      <Prview templates={templates} />
    </div>
  )
}
