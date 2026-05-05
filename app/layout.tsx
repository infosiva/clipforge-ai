import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClipForge AI — Free Text-to-Video Generator',
  description: 'Generate short AI video clips from text in seconds. Free, no signup needed. Powered by open-source AI models.',
  keywords: ['ai video generator', 'text to video', 'free ai video', 'clip generator'],
  openGraph: {
    title: 'ClipForge AI — Free Text-to-Video Generator',
    description: 'Turn any idea into an AI video clip. Free, no account required.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} style={{ margin: 0, padding: 0, background: '#0a0a0f', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
