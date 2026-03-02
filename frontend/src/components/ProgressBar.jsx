export default function ProgressBar({ progress = 0, label, sublabel, color = '#7c3aed' }) {
  return (
    <div style={{ width: '100%' }}>
      {(label || sublabel) && (
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          marginBottom:   '6px',
        }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#9ca3af' }}>
            {label}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color, fontWeight: 700 }}>
            {sublabel ?? `${progress}%`}
          </span>
        </div>
      )}


      <div style={{
        width:        '100%',
        height:       '6px',
        background:   '#1f2937',
        borderRadius: '999px',
        overflow:     'hidden',
      }}>
 
        <div style={{
          width:      `${Math.min(progress, 100)}%`,
          height:     '100%',
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: '999px',
          transition: 'width 0.25s ease',
          boxShadow:  `0 0 10px ${color}55`,
        }} />
      </div>
    </div>
  )
}