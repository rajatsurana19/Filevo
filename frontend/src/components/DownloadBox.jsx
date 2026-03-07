import { useState,useEffect,useRef,useCallback, use } from "react";
import { socketService } from '../services/socket'
import ProgressBar from './ProgressBar'

const formatBytes = (b) => {
    if(!b) return '-'
    if(b<1024*1024) return(b/1024).toFixed(1)+'KB'
    if(b<1024 ** 3) return (b/1024 ** 2).toFixed(2)+'MB'
    return (b/1024 **3).toFixed(2)+'GB'
}

export default function DownloadBox(){
    const [transfers,setTransfers] = useState({})

    const dataRef = useRef({})

    const updateTransfer = useCallback((fileId,patch) => {
        setTransfers(prev => ({
            ...prev,
            [fileId]: {...(prev[fileId] || {}), ...patch},
        }))
    },[])

    useEffect(() => {
        const onManifest = ({fileId,fileName,fileSize,totalChunks,mimeType}) => {
            dataRef.cuurrent[fileId] = {
        chunks:      new Array(totalChunks).fill(null),
        received:    0,
        totalChunks,
        mimeType:    mimeType || 'application/octet-stream',           
        }
        
        updateTransfer(fileId,{
            fileName,
            fileSize,
            totalChunks,
            received: 0,
            progress: 0,
            status: 'receiving',
            startedAt: Date.now(),
        })
        
        }

        const onChunk = ({ fileId,chunkIndex,totalChunks,data: base64}) => {
            const store = dataRef.current[fileId]
            if(!store) return

            try{
                const binary = atob(base64)
                const bytes = new Uint8Array(binary.length)

                for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i)

                store.chunks[chunkIndex] = bytes
                store.received++
            }catch(err){
                console.error('[Filevo] Failed to decode chunk',chunkIndex,err)
                return
            }
            const progress = Math.round((store.received/totalChunks)*100)
            updateTransfer(fileId,{received: store.received,progress})
        }

        const onComplete = ({ fileId}) => {
            const store = dataRef.current[fileId]
            if (!store) return

            const missing = store.chunks.filter(c => c === null).length
        if (missing > 0) {
        console.error(`[Filevo] ${missing} chunks missing for ${fileId}`)
        updateTransfer(fileId, { status: 'error', errorMsg: `${missing} chunks missing` })
        return
            }


        const blob    = new Blob(store.chunks, { type: store.mimeType })
         const url     = URL.createObjectURL(blob)
        const a       = document.createElement('a')


      setTransfers(prev => {
        const t = prev[fileId]
        if (t) {
          a.download = t.fileName || 'filevo_file'
          a.href     = url
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 5000)
        }
        return {
          ...prev,
          [fileId]: { ...t, progress: 100, status: 'done', doneAt: Date.now() }
        }
      })

      delete dataRef.current[fileId]

        }

        socketService.on('file_manifest',onManifest)
        socketService.on('file_chunk',onChunk)
        socketService.on('file_complete', onComplete)

        return() => {
           socketService.on('file_manifest',onManifest)
           socketService.on('file_chunk',onChunk)
           socketService.on('file_complete', onComplete) 
        }
        
    },[updateTransfer])

    const transferList = Object.entries(transfers)

    return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={iconBadge}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div>
          <div style={cardTitle}>Receive Files</div>
          <div style={cardSub}>Incoming transfers appear here automatically</div>
        </div>

        {transferList.length > 0 && (
          <div style={countBadge(transferList.filter(([,t]) => t.status === 'receiving').length)}>
            {transferList.filter(([,t]) => t.status === 'receiving').length > 0
              ? `${transferList.filter(([,t]) => t.status === 'receiving').length} active`
              : `${transferList.length} done`}
          </div>
        )}
      </div>


      {transferList.length === 0 && (
        <div style={emptyState}>
          <div style={{ fontSize: '44px', marginBottom: '14px', opacity: 0.2 }}>📭</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: '#374151', fontSize: '15px', marginBottom: '8px' }}>
            No incoming files yet
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", color: '#1f2937', fontSize: '10px', lineHeight: 1.8, textAlign: 'center' }}>
            Share your Peer ID with the sender.<br />
            Files will appear here and auto-download.
          </div>
        </div>
      )}

      {transferList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transferList.map(([fileId, t]) => (
            <TransferRow key={fileId} transfer={t} />
          ))}
        </div>
      )}
    </div>
    )
}

function TransferRow({transfer:t}){
  const isDone = t.status === 'done'
  const isError = t.status === 'error'
  const isReceiving = t.status === 'receiving'

  const elapsed = t.doneAt && t.startedAt ? ((t.doneAt - t.startedAt)/1000).toFixed(1)+'s':null

  return(
    <div style={transferCard(isDone, isError)}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:   "'Syne', sans-serif",
            fontWeight:   700,
            color:        '#f1f5f9',
            fontSize:     '14px',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            maxWidth:     '200px',
          }}>
            {t.fileName || 'Unknown file'}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4b5563', marginTop: '3px' }}>
            {formatBytes(t.fileSize)}
            {elapsed && <span style={{ marginLeft: '8px', color: '#10b981' }}>· {elapsed}</span>}
          </div>
        </div>

        <div style={statusBadge(isDone, isError, isReceiving)}>
          {isDone ? '✓ SAVED' : isError ? '✕ ERROR' : '⬇ RECV'}
        </div>
      </div>


      <ProgressBar
        progress={t.progress ?? 0}
        label={isError ? t.errorMsg : `${t.received ?? 0} / ${t.totalChunks ?? '?'} chunks`}
        sublabel={isDone ? '100%' : undefined}
        color={isDone ? '#10b981' : isError ? '#ef4444' : '#06b6d4'}
      />
    </div>    
  )
}

const card = {
  background:   '#111827',
  border:       '1px solid #1f2937',
  borderRadius: '20px',
  padding:      '28px',
  minHeight:    '340px',
  display:      'flex',
  flexDirection:'column',
}

const cardHeader = {
  display:      'flex',
  alignItems:   'center',
  gap:          '14px',
  marginBottom: '22px',
}

const iconBadge = {
  width:        '38px',
  height:       '38px',
  background:   'rgba(6,182,212,0.1)',
  border:       '1px solid rgba(6,182,212,0.2)',
  borderRadius: '10px',
  display:      'flex',
  alignItems:   'center',
  justifyContent:'center',
  flexShrink:   0,
}

const cardTitle = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize:   '16px',
  color:      '#f9fafb',
  lineHeight: 1.2,
}

const cardSub = {
  fontFamily: "'Space Mono', monospace",
  fontSize:   '10px',
  color:      '#4b5563',
  marginTop:  '3px',
  letterSpacing: '0.03em',
}

const countBadge = (active) => ({
  marginLeft:   'auto',
  padding:      '4px 10px',
  background:   active ? 'rgba(6,182,212,0.12)' : 'rgba(16,185,129,0.1)',
  border:       `1px solid ${active ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.25)'}`,
  borderRadius: '20px',
  fontFamily:   "'Space Mono', monospace",
  fontSize:     '10px',
  color:        active ? '#06b6d4' : '#10b981',
  whiteSpace:   'nowrap',
})

const emptyState = {
  flex:           1,
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '20px 0 10px',
}

const transferCard = (done, error) => ({
  background:   done ? 'rgba(16,185,129,0.05)' : error ? 'rgba(239,68,68,0.05)' : '#0f172a',
  border:       `1px solid ${done ? 'rgba(16,185,129,0.15)' : error ? 'rgba(239,68,68,0.15)' : '#1e293b'}`,
  borderRadius: '12px',
  padding:      '16px',
})

const statusBadge = (done, error, receiving) => ({
  padding:      '3px 9px',
  borderRadius: '20px',
  fontFamily:   "'Space Mono', monospace",
  fontSize:     '9px',
  fontWeight:   700,
  letterSpacing:'0.08em',
  flexShrink:   0,
  ...(done    ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' } : {}),
  ...(error   ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }  : {}),
  ...(receiving && !done && !error
              ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }  : {}),
})