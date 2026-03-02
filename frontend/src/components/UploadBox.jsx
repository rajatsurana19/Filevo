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

    
}