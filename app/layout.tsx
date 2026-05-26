import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClipForge AI — AI Podcast Clip Generator',
  description: 'Turn any podcast into viral short clips automatically. Upload MP3 or MP4, get AI-scored segments, export 9:16/16:9/1:1 for TikTok, YouTube Shorts & Reels.',
  keywords: ['podcast clip generator', 'AI podcast clipper', 'viral podcast clips', 'podcast to short video', 'podcast highlight reel', 'auto clip podcast'],
  metadataBase: new URL('https://clipforge.ai'),
  openGraph: {
    title: 'ClipForge AI — AI Podcast Clip Generator',
    description: 'Turn any podcast into viral short clips automatically. Upload MP3 or MP4, get AI-scored segments, export 9:16/16:9/1:1 for TikTok, YouTube Shorts & Reels.',
    type: 'website',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ClipForge AI",
          "url": "https://clipforge.ai",
          "description": "Turn any podcast into viral short clips automatically using AI.",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": "2 free clips per month"
          }
        })}} />
      </head>
      <body suppressHydrationWarning className={inter.className} style={{ margin: 0, padding: 0, background: '#0a0a0f', color: '#fff' }}>
        {children}
        <FloatingChatWrapper />
        <Script defer data-site="clipforge.ai" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
