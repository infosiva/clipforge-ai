export const metadata = { title: 'Privacy Policy — ClipForge AI', description: 'How ClipForge AI handles your data.' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#6d28d9', marginBottom: 12 }}>{title}</h2>
    <div style={{ color: '#374151', lineHeight: 1.7, fontSize: 15 }}>{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 48, fontSize: 14 }}>Last updated: June 2025</p>
      <Section title="Data We Collect"><p>We collect video URLs and clip specifications you submit. We do not store video content or process videos server-side beyond generating clip timestamps.</p></Section>
      <Section title="How We Use Data"><p>Video URLs and transcripts are processed by AI to identify highlight clips. We do not store your videos, transcripts, or generated clips after your session.</p></Section>
      <Section title="Cookies"><p>We use minimal session cookies for functionality. No advertising or tracking cookies are used.</p></Section>
      <Section title="Third-Party Services"><p>Video processing uses YouTube Data API. AI analysis uses Groq and/or OpenAI APIs. Data is subject to their privacy policies. We are not affiliated with YouTube/Google.</p></Section>
      <Section title="Data Retention"><p>Video URLs and generated clip data are not retained after your session ends.</p></Section>
      <Section title="Your Rights"><p>Email privacy@clipforge.ai to request deletion of any data we hold about you.</p></Section>
      <Section title="Children&apos;s Privacy"><p>This service is not directed at children under 13. We do not knowingly collect data from minors.</p></Section>
      <Section title="Contact"><p>Questions? Email <a href="mailto:privacy@clipforge.ai" style={{ color: '#7c3aed' }}>privacy@clipforge.ai</a></p></Section>
    </main>
  )
}
