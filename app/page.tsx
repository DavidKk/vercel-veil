import { generate } from '@/components/Meta'

const { generateMetadata } = generate({
  title: 'Vercel Veil - Webhook Gateway & Email Notifications',
  description: 'A lightweight gateway service for processing Sonarr/Radarr webhooks and sending beautifully formatted email notifications via Resend.',
})

export { generateMetadata }

export default function Home() {
  return null
}
