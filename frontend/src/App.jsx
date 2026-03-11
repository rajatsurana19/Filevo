import { useState } from 'react'
import { socketService } from './services/socket'
import UploadBox from './components/UploadBox'
import DownloadBox from './components/DownloadBox'

export default function App() {
  const [step, setStep] = useState('landing')
  const [peerId, setPeerId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleConnect = async () => {
    setStep('connecting')
    setErrorMsg('')
    try {
      const id = await socketService.connect()
      setPeerId(id)
      setStep('connected')

      socketService.on('disconnected', () => {
        setStep('error')
        setErrorMsg('Lost connection to relay server.')
      })
    } catch (err) {
      setStep('error')
      setErrorMsg(err.message || 'Failed to connect to relay server.')
    }
  }

  const handleRetry = () => {
    setStep('landing')
    setErrorMsg('')
  }

  const copyId = () => {
    if (!peerId) return
    navigator.clipboard.writeText(peerId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={shell}>
      <Noise />

      <nav style={nav}>
        <div style={logo}>
          <div style={logoIcon}>
            <FilevoIcon />
          </div>
          <span style={logoName}>Filevo</span>
        </div>

        <div style={navRight}>
          {step === 'connected' && (
            <div style={pill('#10b981', 'rgba(16,185,129,0.1)', 'rgba(16,185,129,0.25)')}>
              <span style={liveDot} />
              RELAY CONNECTED
            </div>
          )}
          {step === 'connecting' && (
            <div style={pill('#fbbf24', 'rgba(251,191,36,0.08)', 'rgba(251,191,36,0.2)')}>
              <span style={{ ...liveDot, background: '#fbbf24', boxShadow: 'none', animation: 'none' }} />
              CONNECTING…
            </div>
          )}
          {(step === 'landing' || step === 'error') && (
            <div style={pill('#4b5563', '#111827', '#1f2937')}>
              <span style={{ ...liveDot, background: '#4b5563', boxShadow: 'none', animation: 'none' }} />
              OFFLINE
            </div>
          )}
        </div>
      </nav>

      <main style={main}>
        {(step === 'landing' || step === 'connecting') && (
          <div style={landingWrap}>
            <div style={heroEyebrow}>Relay-based P2P file transfer</div>
            <h1 style={heroTitle}>
              Drop files across<br />
              <span style={{ color: '#7c3aed' }}>any device.</span>
            </h1>
            <p style={heroDesc}>
              No accounts. No cloud storage. Files flow through an encrypted relay —
              peer to peer, in chunks, in real time.
            </p>

            <button
              onClick={handleConnect}
              disabled={step === 'connecting'}
              style={connectButton(step === 'connecting')}
            >
              {step === 'connecting'
                ? <><Spinner /> Connecting to relay…</>
                : 'Connect & Get My Peer ID →'}
            </button>

            <div style={featurePills}>
              {['No signup', 'Chunked transfer', 'End-to-end relay', 'Auto-download'].map(f => (
                <div key={f} style={featurePill}>{f}</div>
              ))}
            </div>
          </div>
        )}

        {step === 'error' && (
          <div style={landingWrap}>
            <div style={errorCard}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#f9fafb', marginBottom: '8px' }}>
                Connection Failed
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#ef4444', marginBottom: '20px', lineHeight: 1.7 }}>
                {errorMsg}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4b5563', marginBottom: '20px', lineHeight: 1.8 }}>
                Make sure your Python relay server is running at<br />
                <code style={{ color: '#7c3aed' }}>ws://localhost:8000/ws</code><br />
                then try again.
              </div>
              <button onClick={handleRetry} style={retryBtn}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {step === 'connected' && (
          <div style={dashboard}>
            <div style={peerCard}>
              <div style={peerCardLeft}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4b5563', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  YOUR PEER ID
                </div>
                <div style={peerIdText}>{peerId}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#374151', marginTop: '6px' }}>
                  Share this ID so others can send you files
                </div>
              </div>
              <button onClick={copyId} style={copyButton(copied)}>
                {copied
                  ? <><span>✓</span> Copied!</>
                  : <><CopyIcon /> Copy ID</>}
              </button>
            </div>

            <div style={howItWorks}>
              <Step n="1" text="Share your Peer ID with the sender" />
              <Arrow />
              <Step n="2" text="They paste it in Send File + drop their file" />
              <Arrow />
              <Step n="3" text="File chunks relay through server to you" />
              <Arrow />
              <Step n="4" text="Browser auto-downloads assembled file" />
            </div>

            <div style={panels}>
              <UploadBox connected={true} />
              <DownloadBox />
            </div>
          </div>
        )}
      </main>

      <footer style={footer}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#1f2937' }}>
          Filevo · RELAY-BASED · NO DIRECT CONNECTION · Apache LICENSE
        </span>
      </footer>
    </div>
  )
}

function FilevoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
      <line x1="7" y1="19" x2="17" y2="19"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: '8px' }} />
}

function Noise() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`, opacity: 0.4 }} />
  )
}

function Step({ n, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#a78bfa', flexShrink: 0 }}>{n}</div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#6b7280' }}>{text}</span>
    </div>
  )
}

function Arrow() {
  return <div style={{ fontFamily: "'Space Mono', monospace", color: '#1f2937', fontSize: '12px', padding: '0 4px' }}>→</div>
}

const shell = {
  minHeight: '100vh',
  background: '#030712',
  color: '#f9fafb',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const nav = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 32px',
  borderBottom: '1px solid #0f172a',
  position: 'relative',
  zIndex: 10,
}

const logo = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const logoIcon = {
  width: '34px',
  height: '34px',
  background: 'rgba(124,58,237,0.12)',
  border: '1px solid rgba(124,58,237,0.25)',
  borderRadius: '9px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const logoName = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 800,
  fontSize: '20px',
  color: '#f9fafb',
  letterSpacing: '-0.02em',
}

const navRight = { display: 'flex', alignItems: 'center', gap: '12px' }

const pill = (color, bg, border) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  padding: '6px 14px',
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: '20px',
  fontFamily: "'Space Mono', monospace",
  fontSize: '10px',
  color,
  letterSpacing: '0.08em',
})

const liveDot = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#10b981',
  boxShadow: '0 0 6px #10b981',
  flexShrink: 0,
  animation: 'pulse 2s ease-in-out infinite',
}

const main = {
  flex: 1,
  position: 'relative',
  zIndex: 1,
}

const landingWrap = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '80px 24px 40px',
  textAlign: 'center',
}

const heroEyebrow = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '11px',
  color: '#4b5563',
  letterSpacing: '0.1em',
  marginBottom: '20px',
  textTransform: 'uppercase',
}

const heroTitle = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 800,
  fontSize: 'clamp(36px, 6vw, 60px)',
  lineHeight: 1.1,
  color: '#f9fafb',
  marginBottom: '20px',
  letterSpacing: '-0.02em',
}

const heroDesc = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '12px',
  color: '#4b5563',
  lineHeight: 1.9,
  marginBottom: '36px',
}

const connectButton = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '15px 36px',
  background: disabled ? '#1f2937' : '#7c3aed',
  color: disabled ? '#4b5563' : '#fff',
  border: 'none',
  borderRadius: '14px',
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '-0.01em',
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 8px 32px rgba(124,58,237,0.35)',
  transition: 'all 0.2s',
  marginBottom: '28px',
})

const featurePills = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  justifyContent: 'center',
}

const featurePill = {
  padding: '5px 14px',
  background: '#0f172a',
  border: '1px solid #1f2937',
  borderRadius: '20px',
  fontFamily: "'Space Mono', monospace",
  fontSize: '10px',
  color: '#374151',
}

const errorCard = {
  background: '#111827',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: '20px',
  padding: '40px',
  textAlign: 'center',
}

const retryBtn = {
  padding: '12px 28px',
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
}

const dashboard = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '36px 24px 60px',
}

const peerCard = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
  border: '1px solid rgba(124,58,237,0.2)',
  borderRadius: '18px',
  padding: '24px 28px',
  marginBottom: '18px',
  boxShadow: '0 0 40px rgba(124,58,237,0.08)',
  flexWrap: 'wrap',
  gap: '16px',
}

const peerCardLeft = { flex: 1, minWidth: '220px' }

const peerIdText = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '22px',
  fontWeight: 700,
  color: '#a78bfa',
  letterSpacing: '0.04em',
  wordBreak: 'break-all',
}

const copyButton = (copied) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  padding: '10px 20px',
  background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(124,58,237,0.12)',
  color: copied ? '#10b981' : '#a78bfa',
  border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.3)'}`,
  borderRadius: '10px',
  fontFamily: "'Space Mono', monospace",
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
  flexShrink: 0,
})

const howItWorks = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '14px 20px',
  background: '#0a0f1a',
  border: '1px solid #0f172a',
  borderRadius: '12px',
  marginBottom: '20px',
}

const panels = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
}

const footer = {
  textAlign: 'center',
  padding: '20px',
  borderTop: '1px solid #0f172a',
  position: 'relative',
  zIndex: 1,
}