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