import radarrDefault from '@/templates/emails/radarr-default.html?raw'
import sonarrDefault from '@/templates/emails/sonarr-default.html?raw'

export interface EmailTemplateDefinition {
  id: string
  name: string
  description?: string
  html: string
  variables: string[]
  defaultVariables: Record<string, string>
}

const templates: EmailTemplateDefinition[] = [
  {
    id: 'sonarr-default',
    name: 'Sonarr Default Template',
    description: 'Base template for Sonarr webhook notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'The Last of Us',
      eventType: 'Download',
      actionLabel: 'Download Complete',
      instanceName: 'sonarr-lab',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'Yes',
      episodeList: '<div class="stack-item">S02E05 · Endure and Survive · 2025-02-09</div><div class="stack-item">S02E06 · The Dam · 2025-02-16</div>',
      releaseDetails: '<div class="stack-item">Quality: 2160p WEB-DL Dolby Vision</div><div class="stack-item">Release Group: NTb</div><div class="stack-item">Size: 8.4 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: "Joel and Ellie arrive at the Colorado hospital, where the Fireflies' true plan is revealed, and the journey faces its most difficult choice.",
      detailUrl: 'https://www.thetvdb.com/series/the-last-of-us',
    },
  },
  {
    id: 'radarr-default',
    name: 'Radarr Default Template',
    description: 'Base template for Radarr webhook notifications',
    html: radarrDefault,
    variables: ['movieTitle', 'eventType', 'actionLabel', 'year', 'instanceName', 'downloadClient', 'isUpgrade', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      movieTitle: 'Dune: Part Two',
      eventType: 'Upgrade',
      actionLabel: 'Upgrade',
      year: '2024',
      instanceName: 'radarr-uplink',
      downloadClient: 'NZBGet · ArrAuto',
      isUpgrade: 'Yes',
      releaseDetails:
        '<div class="stack-item">Quality: 2160p REMUX HEVC HDR10+</div><div class="stack-item">Release Group: TERMiNAL</div><div class="stack-item">Size: 82.7 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      detailUrl: 'https://www.themoviedb.org/movie/693134-dune-part-two',
    },
  },
]

export function listTemplates() {
  return templates.map((template) => {
    const { html, ...rest } = template
    void html
    return rest
  })
}

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}

export function renderTemplate(html: string, variables: Record<string, string>) {
  return html.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = variables[key]
    return value ?? ''
  })
}
