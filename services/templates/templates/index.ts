import type { EmailTemplateDefinition } from '../types'
import { moviesTemplates } from './movies'
import { prowlarrTemplates } from './prowlarr'
import { radarrTemplates } from './radarr'
import { sonarrTemplates } from './sonarr'

export const templates: EmailTemplateDefinition[] = [...sonarrTemplates, ...radarrTemplates, ...prowlarrTemplates, ...moviesTemplates]
