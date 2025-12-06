import moviesNew from '@/templates/emails/movies-new.hbs?raw'

import type { EmailTemplateDefinition } from '../types'

export const moviesTemplates: EmailTemplateDefinition[] = [
  {
    id: 'movies-new',
    name: 'Movies - New Movies Notification',
    description: 'Template for new movies notification',
    html: moviesNew,
    variables: ['newMoviesCount', 'newMoviesJSON', 'shareUrl', 'currentDate'],
    defaultVariables: {
      newMoviesCount: '3',
      newMoviesJSON: JSON.stringify([
        {
          poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=80&q=80',
          name: 'Movie 1',
          year: 2024,
          score: '8.5',
          releaseDate: '2024-01-15',
          detailUrl: 'https://example.com/movies/123',
        },
        {
          poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=80&q=80',
          name: 'Movie 2',
          year: 2024,
          score: '7.8',
          releaseDate: '2024-02-20',
          detailUrl: 'https://example.com/movies/456',
        },
      ]),
      shareUrl: 'https://example.com/movies/share/token123',
      currentDate: '2024-01-15',
    },
  },
]
