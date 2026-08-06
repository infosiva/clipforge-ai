import { ImageResponse } from 'next/og'
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="6" width="14" height="12" rx="2" stroke="white" strokeWidth="2"/>
        <path d="M17 9.5l4-2.5v10l-4-2.5" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="white" fillOpacity="0.15"/>
      </svg>
    </div>
  )
}
