import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'
import FeedbackWidget from '@/components/FeedbackWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClipForge AI — AI Video Clip Generator | No Watermark, 60 Seconds',
  description: 'AI video clip generator that finds viral moments from long videos. TikTok, Reels, Shorts, LinkedIn — no watermark on free plan.',
  keywords: ['podcast clip generator', 'AI podcast clipper', 'viral podcast clips', 'podcast to short video', 'podcast highlight reel', 'auto clip podcast', 'no watermark video clipper', 'video clip generator'],
  metadataBase: new URL('https://clipforge.ai'),
  openGraph: {
    title: 'ClipForge AI — AI Video Clip Generator | No Watermark, 60 Seconds',
    description: 'AI video clip generator that finds viral moments from long videos. TikTok, Reels, Shorts, LinkedIn — no watermark on free plan.',
    type: 'website',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-4237294630161176" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ClipForge AI",
          "url": "https://clipforge.ai",
          "description": "Turn any podcast or long video into viral short clips automatically using AI.",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": "2 free clips per month"
          }
        })}} />
      </head>
      <body suppressHydrationWarning className={inter.className} style={{ margin: 0, padding: 0, background: '#f8fafc', color: '#0f172a' }}>
        {children}
        <FloatingChatWrapper />
        <FeedbackWidget />
      </body>
    </html>
  )
}
