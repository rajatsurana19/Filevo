import json
import logging
from fastapi import WebSocket,WebSocketDisconnect
from server.peer_manager import peer_manager

logger = logging.getLogger("filevo.relay")

RELAY_TYPES = {"file_manifest","file_chunk","file_complete"}

async def handle_peer(ws: WebSocket,sender_id: str) -> None:
    await ws.accept()
    await peer_manager.register(sender_id,ws)

    await _send(ws,{"type": "connected", "peer_id": sender_id})

    try:
        while True:
            raw = await ws.receive_text()
            await _dispatch(ws,sender_id,raw)

    except WebSocketDisconnect:
        logger.info(f"WebSocket Disconnected: {sender_id}")
    except Exception as exc:
        logger.error(f"Error in peer loop for {sender_id} : {exc}",exc_info=True)
    finally:
        await peer_manager.unregister(sender_id)

async def _dispatch(sender_ws: WebSocket,sender_id:str,raw: str) -> None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Bad JSON from {sender_id}: {raw[:80]}")
        await _send(sender_ws, {"type": "error","message":"Invalid JSON"})
        return
    msg_type = msg.get("type","unknown")

    if msg_type == "ping":
        await _send(sender_ws,{"type": "pong"})
        return
    
    if msg_type in RELAY_TYPES:
        target_id = msg.get("target")

        if not target_id:
            await _send(sender_ws,{
                "type":    "error",
                "message": f"Message type '{msg_type}' requires a 'target' field",
            })
            return
        
        target_ws = peer_manager.get(target_id)

        if target_ws is None:
            logger.warning(f"Target peer not found: {target_id}")
            await _send(sender_ws, {
                "type":    "error",
                "message": f"Peer '{target_id}' is not connected",
                "target":  target_id,
            })
            return
        msg["from"] = sender_id

        try:
            await _send(target_ws, msg)
            
            if msg_type == "file_chunk":
                idx   = msg.get("chunkIndex", "?")
                total = msg.get("totalChunks", "?")
                fid   = msg.get("fileId", "?")
                logger.debug(f"Chunk {idx}/{total} for file {fid}: {sender_id} → {target_id}")
            else:
                logger.info(f"[{msg_type}] {sender_id} → {target_id}")
        except Exception as exc:
            logger.error(f"Failed to relay to {target_id}: {exc}")
            await _send(sender_ws, {
                "type":    "error",
                "message": f"Failed to reach peer '{target_id}'",
            })
        return
    

    logger.debug(f"Unknown message type '{msg_type}' from {sender_id}")
    await _send(sender_ws, {
        "type":    "error",
        "message": f"Unknown message type: '{msg_type}'",
    })


async def _send(ws: WebSocket, payload: dict) -> None:
    try:
        await ws.send_json(payload)
    except Exception:
        pass
