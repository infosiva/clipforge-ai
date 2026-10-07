export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-black tracking-tight text-slate-900" aria-label="ClipForge AI">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f5f73" />
        <path d="M9 9h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M20 14l6-3v10l-6-3z" fill="#fff" />
      </svg>
      <span>Clip<span style={{ color: '#0f5f73' }}>Forge</span></span>
      <span className="text-slate-500 font-medium text-base">AI</span>
    </span>
  )
}
