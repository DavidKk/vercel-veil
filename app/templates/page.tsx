import { checkAccess } from '@/services/auth/access'
import { listTemplates } from '@/services/templates/registry'

import { Prview } from './Prview'

export default async function TemplatesPage() {
  await checkAccess({ isApiRouter: false })
  const templates = listTemplates()

  return (
    <div className="flex h-[calc(100vh-60px-64px)] overflow-hidden">
      <Prview templates={templates} />
    </div>
  )
}
