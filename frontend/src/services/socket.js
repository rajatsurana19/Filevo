const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
export const CHUNK_SIZE = 512 * 1024 

class SocketService{
    constructor(){
        this.ws = null
        this.peerId = this._makePeerId()
        this.listeners = {}
        this.connected = false
    }

    _makePeerId(){
        return 'fvo_'+Math.random().toString(36).substring(2,8)
    }

    connect(){
        return new Promise((resolve,reject) => {
            try{
                this.ws = new WebSocket(`${WS_URL}/${this.peerId}`)
            }
            catch(err){
                reject(new Error('Invalid Websocket URL'))
                return
            }

            const timeout = setTimeout(() => {
                reject(new Error('Connection Time Out'))
                this.ws?.close()
            },8000)

            this.ws.onopen = () => {
                clearTimeout(timeout)
                this.connected = true
                console.log('[Filevo] Connected as ',this.peerId)
                resolve(this.peerId)
            }

            this.ws.onerror = () => {
                clearTimeout(timeout)
                reject(new Error('Could Not Reach Relay Server'))
            }

            this.ws.onmessage = (event) => {
                try{
                    const data = JSON.parse(event.data)
                    this._emit(data.type,data)
                }
                catch {
                    console.warn('[Filvo] Bad Message From Server: ',event.data)
                }
            }

            this.ws.onclose = () => {
                this.connected = false
                this._emit('disconnected',{})
                console.log('[Filevo] Disconnected')
            }
        })
    }

    disconnect() {
        this.ws?.close()
        this.connected = false
    }

    send(payload){
        if(this.ws?.readyState === WebSocket.OPEN){
            this.ws.send(JSON.stringify(payload))
            return true
        }
        console.warn('[Filevo] Cannot Send - Not Connected')
        return false
    }

    on(event,cb){
        if(!this.listeners[event]) this.listeners[event] = []
        this.listeners[event].push(cb)
    }

    off(event,cb){
        if(!this.listeners[event]) return
        this.listeners[event] = this.listeners[event].filter(fn => fn != cb)
    }

    _emit(event,data){
        this.listeners[event]?.forEach(cb => cb(data))
    }

    async uploadFile(file,targetPeerId,{onProgress,onError} = { } ){
        if(!this.connected){
            onError?.('Not Connected to relay')
            return null
        }
        const fileId = 'f_' + Math.random().toString(36).substring(2,10)
        const totalChunks = Math.ceil(file.size/CHUNK_SIZE)
        
        this.send({
            type : 'file_manifest',
            target : targetPeerId,
            fileId,
            fileName: file.name,
            fileSize : file.size,
            totalChunks,
            mimeType : file.type || 'application/octet-stream'
        })

        for(let i=0;i<totalChunks;i++){
            const start = i * CHUNK_SIZE
            const end = Math.min(start+CHUNK_SIZE,file.size)
            const slice = file.slice(start,end)
            const buffer = await slice.arrayBuffer()

            const bytes =   new Uint8Array(buffer)
            let binary = ''
            for(let b=0;b<binary.byteLength;b++) binary+= String.fromCharCode(bytes[b])
            const base64 = btoa(binary)

            this.send({
                type: 'file_chunk',
                target: targetPeerId,
                fileId,
                chunkIndex : i,
                totalChunks,
                data : base64
            })

            onProgress?.(Math.round(((i+1)/totalChunks)*100))

            await new Promise(r => setTimeout(r,5))
        }

        this.send({ type: 'file_complete', target: targetPeerId, fileId })

        return fileId
    }

}

export const socketService = new SocketService()
