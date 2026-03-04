import { useState,useRef } from "react";
import {socketService } from './services/socket'
import ProgressBar from './ProgressBar'

const formatBytes = (b) => {
    if(!b) return '0 B'
    if(b<1024) return b + 'B'
    if(b<1024*1024) return (b/1024).toFixed(1)+ 'KB'
    if(b<1024**3) return(b/1024 ** 2).toFixed(2) + 'MB'
    return (b/1024**3).toFixed(2) + 'GB'
}

const getFileIcon = (name = '') => {
    const ext = name.split('.').pop()?.toLowerCase()
    const map = {
    pdf: '📄', zip: '🗜️', rar: '🗜️', mp4: '🎬', mov: '🎬',
    mp3: '🎵', wav: '🎵', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
    gif: '🖼️', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    py: '🐍', js: '🟨', ts: '🟦', html: '🌐', css: '🎨',
    }

    return map[ext] || '📦'
}

export default function UploadBox({connected}) {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState(null)
    const [targetId,setTargetId] = useState('')
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('idle')
    const [errMsg,setErrMsg] = useState('')
    const inputRef = useRef()

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if(f) {setFile(f); setStatus('idle'); setProgress(0)}
    }

    const handleFileChange = (e) => {
        const f = e.target.files[0]
        if(f) { setFile(f); setStatus('idle'); setProgress(0)}
    
    }

    const clearFile = (e) => {
        e.stopPropagation()
        setFile(null)
        setStatus('idle')
        setProgress(0)
        inputRef.current.value = ''
    }

    const handleSend = async () => {
        if(!file || !targetId.trim()) return
        setStatus('uploading')
        setProgress(0)
        setErrMsg('')

        await socketService.uploadFile(file,targetId.trim(),{
            onprogress: (pct) => setProgress(pct),
            onError: (msg) => { setStatus('error'); setErrMsg(msg)},
        })

        if(status != 'error') setStatus('done')
    }

    const canSend = file && targetId.trim().length > 0 && connected && status != 'uploading'

  return (
    <div style={card}>

      <div style={cardHeader}>
        <div style={iconBadge('rgba(124,58,237,0.15)', '#7c3aed')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <div style={cardTitle}>Send File</div>
          <div style={cardSub}>Drop a file and enter receiver's Peer ID</div>
        </div>
      </div>

      <div
        onClick={() => !file && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={dropZone(dragging, !!file)}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {file ? (

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
            <div style={{ fontSize: '32px', flexShrink: 0 }}>{getFileIcon(file.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...monoText, color: '#e5e7eb', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ ...monoText, color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                {formatBytes(file.size)}
              </div>
            </div>
            <button onClick={clearFile} style={clearBtn} title="Remove file">✕</button>
          </div>
        ) : (

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.5 }}>
              {dragging ? '📂' : '⬆️'}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", color: dragging ? '#a78bfa' : '#6b7280', fontSize: '14px', fontWeight: 600 }}>
              {dragging ? 'Release to select' : 'Drop file here'}
            </div>
            <div style={{ ...monoText, color: '#374151', fontSize: '10px', marginTop: '6px' }}>
              or click to browse
            </div>
          </div>
        )}
      </div>


      <div style={{ marginTop: '16px' }}>
        <label style={fieldLabel}>RECEIVER PEER ID</label>
        <input
          type="text"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="mesh_abc123 — ask them to share it"
          style={textInput}
          spellCheck={false}
        />
      </div>


      {status === 'uploading' && (
        <div style={{ marginTop: '16px' }}>
          <ProgressBar
            progress={progress}
            label="Sending chunks through relay..."
            color="#7c3aed"
          />
        </div>
      )}

      {status === 'done' && (
        <div style={alert('rgba(16,185,129,0.1)', '#10b981', '#064e3b')}>
          <span style={{ fontSize: '16px' }}>✓</span>
          <span>File sent successfully! The receiver's browser will auto-download it.</span>
        </div>
      )}
      {status === 'error' && (
        <div style={alert('rgba(239,68,68,0.1)', '#ef4444', '#7f1d1d')}>
          <span style={{ fontSize: '16px' }}>✕</span>
          <span>{errMsg || 'Transfer failed — check that both peers are connected.'}</span>
        </div>
      )}

      {!connected && (
        <div style={alert('rgba(251,191,36,0.08)', '#fbbf24', '#78350f')}>
          <span style={{ fontSize: '14px' }}>⚠</span>
          <span>Connect to relay first before sending.</span>
        </div>
      )}


      <button
        onClick={handleSend}
        disabled={!canSend}
        style={sendBtn(!canSend, status === 'uploading')}
      >
        {status === 'uploading'
          ? `Sending... ${progress}%`
          : status === 'done'
          ? '✓ Sent — Send Another'
          : 'Send File →'}
      </button>
    </div>
  )
}

const card = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: '20px',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
}

const cardHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  marginBottom: '22px',
}

const iconBadge = (bg,color) => ({
  width:        '38px',
  height:       '38px',
  background:   bg,
  border:       `1px solid ${color}33`,
  borderRadius: '10px',
  display:      'flex',
  alignItems:   'center',
  justifyContent:'center',
  flexShrink:   0,
})

const cardTitle = {
  fontFamily: "'Sybe',sans-serif",
  fontWeight: 700,
  fontSize: '16px',
  color: '#f9fafb',
  lineHeight: 1.2,
}

const cardSub = {
  fontFamily: "'Space Mono', monospace",
  fontSize:   '10px',
  color:      '#4b5563',
  marginTop:  '3px',
  letterSpacing: '0.03em',
}

const dropZone = (dragging, hasFile) => ({
  border:        `2px dashed ${dragging ? '#7c3aed' : hasFile ? '#374151' : '#1f2937'}`,
  borderRadius:  '14px',
  padding:       hasFile ? '16px 20px' : '36px 20px',
  cursor:        hasFile ? 'default' : 'pointer',
  background:    dragging ? 'rgba(124,58,237,0.06)' : hasFile ? 'rgba(255,255,255,0.02)' : 'transparent',
  transition:    'all 0.2s ease',
  display:       'flex',
  alignItems:    'center',
  justifyContent:'center',
  minHeight:     hasFile ? 'auto' : '140px',
})

const clearBtn = {
  background:   'rgba(239,68,68,0.1)',
  border:       '1px solid rgba(239,68,68,0.2)',
  borderRadius: '6px',
  color:        '#ef4444',
  width:        '28px',
  height:       '28px',
  cursor:       'pointer',
  fontSize:     '12px',
  flexShrink:   0,
  display:      'flex',
  alignItems:   'center',
  justifyContent:'center',
}


const monoText = {
  fontFamily: "'Space Mono', monospace",
}

const fieldLabel = {
  display:       'block',
  fontFamily:    "'Space Mono', monospace",
  fontSize:      '10px',
  color:         '#4b5563',
  letterSpacing: '0.08em',
  marginBottom:  '8px',
}

const textInput = {
  width:        '100%',
  background:   '#0f172a',
  border:       '1px solid #1f2937',
  borderRadius: '10px',
  padding:      '11px 14px',
  color:        '#e2e8f0',
  fontFamily:   "'Space Mono', monospace",
  fontSize:     '12px',
  outline:      'none',
  boxSizing:    'border-box',
  transition:   'border-color 0.15s',
}

const alert = (bg, color, dark) => ({
  marginTop:    '14px',
  display:      'flex',
  alignItems:   'flex-start',
  gap:          '10px',
  padding:      '12px 14px',
  background:   bg,
  border:       `1px solid ${color}33`,
  borderRadius: '10px',
  color,
  fontFamily:   "'Space Mono', monospace",
  fontSize:     '11px',
  lineHeight:   1.6,
})

const sendBtn = (disabled, loading) => ({
  marginTop:    '18px',
  width:        '100%',
  padding:      '14px',
  background:   disabled ? '#1f2937' : loading ? '#5b21b6' : '#7c3aed',
  color:        disabled ? '#374151' : '#fff',
  border:       'none',
  borderRadius: '12px',
  fontFamily:   "'Syne', sans-serif",
  fontWeight:   700,
  fontSize:     '14px',
  letterSpacing:'0.04em',
  cursor:       disabled ? 'not-allowed' : 'pointer',
  transition:   'all 0.2s',
  boxShadow:    disabled ? 'none' : '0 4px 20px rgba(124,58,237,0.3)',
})