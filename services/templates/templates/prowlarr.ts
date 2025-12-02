import prowlarrDefault from '@/templates/emails/prowlarr-default.hbs?raw'

import type { EmailTemplateDefinition } from '../types'

export const prowlarrTemplates: EmailTemplateDefinition[] = [
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
