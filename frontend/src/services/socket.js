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

    

}