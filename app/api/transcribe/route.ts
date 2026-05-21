import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/transcribe'
import config from '@/vertical.config'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav',
      'audio/webm', 'audio/ogg', 'audio/flac', 'video/mp4', 'video/webm']
    if (!allowedTypes.some(t => file.type.startsWith(t.split('/')[0])) &&
        !file.name.match(/\.(mp3|mp4|m4a|wav|webm|ogg|flac)$/i)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const maxBytes = config.maxAudioMb * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${config.maxAudioMb}MB)` },
        { status: 413 },
      )
    }

    const buffer = await file.arrayBuffer()
    const result = await transcribeAudio(buffer, file.name)

    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[transcribe] Error:', msg)
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 })
  }
}
