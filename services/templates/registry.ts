import prowlarrDefault from '@/templates/emails/prowlarr-default.html?raw'
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
  // Sonarr Templates
  {
    id: 'sonarr-grab',
    name: 'Sonarr - Grab',
    description: 'Template for Sonarr grab notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'One Piece',
      eventType: 'Grab',
      actionLabel: 'Grab',
      instanceName: 'sonarr-lab',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'No',
      episodeList: '<div class="stack-item">S01E1151 · Episode 1151 · 2025-01-19</div>',
      releaseDetails:
        '<div class="stack-item">Quality: 1080p WEB-DL</div><div class="stack-item">Title: [New-raws] One Piece - 1151 [1080p] [WEB-DL].mkv</div><div class="stack-item">Indexer: Nyaa.si</div><div class="stack-item">Size: 1.2 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: "Monkey D. Luffy and his pirate crew explore the Grand Line in search of the world's ultimate treasure.",
      detailUrl: 'https://www.thetvdb.com/series/one-piece',
    },
  },
  {
    id: 'sonarr-download',
    name: 'Sonarr - Download',
    description: 'Template for Sonarr download complete notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'The Last of Us',
      eventType: 'Download',
      actionLabel: 'Download Complete',
      instanceName: 'sonarr-lab',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'No',
      episodeList: '<div class="stack-item">S02E05 · Endure and Survive · 2025-02-09</div><div class="stack-item">S02E06 · The Dam · 2025-02-16</div>',
      releaseDetails: '<div class="stack-item">Quality: 2160p WEB-DL Dolby Vision</div><div class="stack-item">Release Group: NTb</div><div class="stack-item">Size: 8.4 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: "Joel and Ellie arrive at the Colorado hospital, where the Fireflies' true plan is revealed, and the journey faces its most difficult choice.",
      detailUrl: 'https://www.thetvdb.com/series/the-last-of-us',
    },
  },
  {
    id: 'sonarr-upgrade',
    name: 'Sonarr - Upgrade',
    description: 'Template for Sonarr upgrade notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'The Last of Us',
      eventType: 'Upgrade',
      actionLabel: 'Upgrade',
      instanceName: 'sonarr-lab',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'Yes',
      episodeList: '<div class="stack-item">S02E05 · Endure and Survive · 2025-02-09</div>',
      releaseDetails:
        '<div class="stack-item">Quality: 2160p REMUX HEVC HDR10+</div><div class="stack-item">Release Group: TERMiNAL</div><div class="stack-item">Size: 12.8 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: "Joel and Ellie arrive at the Colorado hospital, where the Fireflies' true plan is revealed, and the journey faces its most difficult choice.",
      detailUrl: 'https://www.thetvdb.com/series/the-last-of-us',
    },
  },
  {
    id: 'sonarr-rename',
    name: 'Sonarr - Rename',
    description: 'Template for Sonarr rename notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'Breaking Bad',
      eventType: 'Rename',
      actionLabel: 'Rename',
      instanceName: 'sonarr-lab',
      downloadClient: '',
      isUpgrade: 'No',
      episodeList: '<div class="stack-item">S05E16 · Felina · 2013-09-29</div>',
      releaseDetails: '',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: 'A high school chemistry teacher turned methamphetamine manufacturer partners with a former student.',
      detailUrl: 'https://www.thetvdb.com/series/breaking-bad',
    },
  },
  {
    id: 'sonarr-episodefiledelete',
    name: 'Sonarr - Episode File Delete',
    description: 'Template for Sonarr episode file delete notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'Game of Thrones',
      eventType: 'EpisodeFileDelete',
      actionLabel: 'Delete File',
      instanceName: 'sonarr-lab',
      downloadClient: '',
      isUpgrade: 'No',
      episodeList: '<div class="stack-item">S08E06 · The Iron Throne · 2019-05-19</div>',
      releaseDetails: '',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: 'Nine noble families fight for control over the lands of Westeros.',
      detailUrl: 'https://www.thetvdb.com/series/game-of-thrones',
    },
  },
  {
    id: 'sonarr-seriesdelete',
    name: 'Sonarr - Series Delete',
    description: 'Template for Sonarr series delete notifications',
    html: sonarrDefault,
    variables: ['seriesTitle', 'eventType', 'actionLabel', 'instanceName', 'downloadClient', 'isUpgrade', 'episodeList', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      seriesTitle: 'The Office',
      eventType: 'SeriesDelete',
      actionLabel: 'Delete Series',
      instanceName: 'sonarr-lab',
      downloadClient: '',
      isUpgrade: 'No',
      episodeList: '',
      releaseDetails: '',
      coverImage: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80',
      synopsis: 'A mockumentary on a group of typical office workers.',
      detailUrl: 'https://www.thetvdb.com/series/the-office',
    },
  },
  // Radarr Templates
  {
    id: 'radarr-grab',
    name: 'Radarr - Grab',
    description: 'Template for Radarr grab notifications',
    html: radarrDefault,
    variables: ['movieTitle', 'eventType', 'actionLabel', 'year', 'instanceName', 'downloadClient', 'isUpgrade', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      movieTitle: 'Dune: Part Two',
      eventType: 'Grab',
      actionLabel: 'Grab',
      year: '2024',
      instanceName: 'radarr-uplink',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'No',
      releaseDetails:
        '<div class="stack-item">Quality: 2160p WEB-DL</div><div class="stack-item">Title: Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.HDR.HEVC</div><div class="stack-item">Indexer: RARBG</div><div class="stack-item">Size: 18.5 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      detailUrl: 'https://www.themoviedb.org/movie/693134-dune-part-two',
    },
  },
  {
    id: 'radarr-download',
    name: 'Radarr - Download',
    description: 'Template for Radarr download complete notifications',
    html: radarrDefault,
    variables: ['movieTitle', 'eventType', 'actionLabel', 'year', 'instanceName', 'downloadClient', 'isUpgrade', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      movieTitle: 'Dune: Part Two',
      eventType: 'Download',
      actionLabel: 'Download Complete',
      year: '2024',
      instanceName: 'radarr-uplink',
      downloadClient: 'qBittorrent · Auto',
      isUpgrade: 'No',
      releaseDetails:
        '<div class="stack-item">Quality: 2160p WEB-DL Dolby Vision</div><div class="stack-item">Release Group: TERMiNAL</div><div class="stack-item">Size: 18.5 GB</div>',
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      detailUrl: 'https://www.themoviedb.org/movie/693134-dune-part-two',
    },
  },
  {
    id: 'radarr-upgrade',
    name: 'Radarr - Upgrade',
    description: 'Template for Radarr upgrade notifications',
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
  {
    id: 'radarr-moviedelete',
    name: 'Radarr - Movie Delete',
    description: 'Template for Radarr movie delete notifications',
    html: radarrDefault,
    variables: ['movieTitle', 'eventType', 'actionLabel', 'year', 'instanceName', 'downloadClient', 'isUpgrade', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      movieTitle: 'The Matrix',
      eventType: 'MovieDelete',
      actionLabel: 'Delete Movie',
      year: '1999',
      instanceName: 'radarr-uplink',
      downloadClient: '',
      isUpgrade: 'No',
      releaseDetails: '',
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80',
      synopsis: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
      detailUrl: 'https://www.themoviedb.org/movie/603-the-matrix',
    },
  },
  {
    id: 'radarr-moviefiledelete',
    name: 'Radarr - Movie File Delete',
    description: 'Template for Radarr movie file delete notifications',
    html: radarrDefault,
    variables: ['movieTitle', 'eventType', 'actionLabel', 'year', 'instanceName', 'downloadClient', 'isUpgrade', 'releaseDetails', 'coverImage', 'synopsis', 'detailUrl'],
    defaultVariables: {
      movieTitle: 'Inception',
      eventType: 'MovieFileDelete',
      actionLabel: 'Delete File',
      year: '2010',
      instanceName: 'radarr-uplink',
      downloadClient: '',
      isUpgrade: 'No',
      releaseDetails: '',
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80',
      synopsis: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
      detailUrl: 'https://www.themoviedb.org/movie/27205-inception',
    },
  },
  // Prowlarr Templates
  {
    id: 'prowlarr-grab',
    name: 'Prowlarr - Grab',
    description: 'Template for Prowlarr grab notifications',
    html: prowlarrDefault,
    variables: ['indexerName', 'eventType', 'actionLabel', 'instanceName', 'protocol', 'statusChange', 'message', 'indexerDetails', 'releaseDetails', 'applicationUrl'],
    defaultVariables: {
      indexerName: 'Nyaa.si',
      eventType: 'Grab',
      actionLabel: 'Grab',
      instanceName: 'prowlarr-main',
      protocol: 'Torrent',
      statusChange: 'N/A',
      message: '[New-raws] One Piece - 1151 [1080p] [WEB-DL].mkv grabbed by Sonarr from Nyaa.si',
      indexerDetails: '',
      releaseDetails:
        '<div class="stack-item">Title: [New-raws] One Piece - 1151 [1080p] [WEB-DL].mkv</div><div class="stack-item">Quality: 1080p WEB-DL</div><div class="stack-item">Indexer: Nyaa.si</div><div class="stack-item">Size: 1.2 GB</div>',
    },
  },
  {
    id: 'prowlarr-indexerstatuschange',
    name: 'Prowlarr - Indexer Status Change',
    description: 'Template for Prowlarr indexer status change notifications',
    html: prowlarrDefault,
    variables: ['indexerName', 'eventType', 'actionLabel', 'instanceName', 'protocol', 'statusChange', 'message', 'indexerDetails', 'releaseDetails', 'applicationUrl'],
    defaultVariables: {
      indexerName: 'RARBG',
      eventType: 'IndexerStatusChange',
      actionLabel: 'Indexer Status Change',
      instanceName: 'prowlarr-main',
      protocol: 'Torrent',
      statusChange: 'Healthy → Unhealthy',
      message: 'Indexer is no longer responding to requests',
      indexerDetails:
        '<div class="stack-item">Protocol: Torrent</div><div class="stack-item">Priority: 1</div><div class="stack-item">RSS: Enabled</div><div class="stack-item">Automatic Search: Enabled</div>',
      releaseDetails: '',
    },
  },
  {
    id: 'prowlarr-indexerupdate',
    name: 'Prowlarr - Indexer Update',
    description: 'Template for Prowlarr indexer update notifications',
    html: prowlarrDefault,
    variables: ['indexerName', 'eventType', 'actionLabel', 'instanceName', 'protocol', 'statusChange', 'message', 'indexerDetails', 'releaseDetails', 'applicationUrl'],
    defaultVariables: {
      indexerName: '1337x',
      eventType: 'IndexerUpdate',
      actionLabel: 'Indexer Update',
      instanceName: 'prowlarr-main',
      protocol: 'Torrent',
      statusChange: 'N/A',
      message: 'Indexer configuration has been updated',
      indexerDetails:
        '<div class="stack-item">Protocol: Torrent</div><div class="stack-item">Priority: 2</div><div class="stack-item">RSS: Enabled</div><div class="stack-item">Automatic Search: Enabled</div><div class="stack-item">Interactive Search: Enabled</div>',
      releaseDetails: '',
    },
  },
  {
    id: 'prowlarr-indexerdelete',
    name: 'Prowlarr - Indexer Delete',
    description: 'Template for Prowlarr indexer delete notifications',
    html: prowlarrDefault,
    variables: ['indexerName', 'eventType', 'actionLabel', 'instanceName', 'protocol', 'statusChange', 'message', 'indexerDetails', 'releaseDetails', 'applicationUrl'],
    defaultVariables: {
      indexerName: 'ThePirateBay',
      eventType: 'IndexerDelete',
      actionLabel: 'Indexer Delete',
      instanceName: 'prowlarr-main',
      protocol: 'Torrent',
      statusChange: 'N/A',
      message: 'Indexer has been removed from Prowlarr',
      indexerDetails: '<div class="stack-item">Protocol: Torrent</div><div class="stack-item">Priority: 3</div>',
      releaseDetails: '',
    },
  },
  {
    id: 'prowlarr-indexeradded',
    name: 'Prowlarr - Indexer Added',
    description: 'Template for Prowlarr indexer added notifications',
    html: prowlarrDefault,
    variables: ['indexerName', 'eventType', 'actionLabel', 'instanceName', 'protocol', 'statusChange', 'message', 'indexerDetails', 'releaseDetails', 'applicationUrl'],
    defaultVariables: {
      indexerName: 'TorrentGalaxy',
      eventType: 'IndexerAdded',
      actionLabel: 'Indexer Added',
      instanceName: 'prowlarr-main',
      protocol: 'Torrent',
      statusChange: 'N/A',
      message: 'New indexer has been added to Prowlarr',
      indexerDetails:
        '<div class="stack-item">Protocol: Torrent</div><div class="stack-item">Priority: 4</div><div class="stack-item">RSS: Enabled</div><div class="stack-item">Automatic Search: Enabled</div><div class="stack-item">Interactive Search: Enabled</div>',
      releaseDetails: '',
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
  let result = html.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = variables[key]
    return value ?? ''
  })

  // Remove empty divs that contain only whitespace (for releaseDetails, indexerDetails, message)
  // This handles cases where variables are empty and would show empty boxes
  result = result.replace(/<div class="stack">\s*<\/div>/g, '')
  result = result.replace(/<div class="message">\s*<\/div>/g, '')

  // Remove empty section divs (which contain empty stack divs)
  result = result.replace(/<div class="section">\s*<h2>.*?<\/h2>\s*<\/div>/g, '')

  return result
}
