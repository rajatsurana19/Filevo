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

        
    })
}