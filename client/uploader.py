import asyncio
import base64
import json
import random
import string
import logging

import websockets

from file_engine.chunker import chunk_file,build_manifest

logger = logging.getLogger("filevo.uploader")

WS_URL = "ws://localhost:8000/ws"

def _make_peer_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"filevo_{suffix}"

async def upload(file_path: str,target_peer_id: str,ws_url:str = WS_URL, on_progress=None):
    peer_id = _make_peer_id()
    file_id = "f_"+"".join(random.choices(string.ascii_lowercase+string.digits,k=8))
    url = f"{ws_url}/{peer_id}"

    logger.info(f"Connecting as {peer_id} → target: {target_peer_id}")

    async with websockets.connect(url) as ws:
        raw = await ws.recv()
        msg = json.loads(raw)
        if msg.get("type") != "connected":
            raise RuntimeError(f"Unexpected server message: {msg}")
        
        logger.info(f"Connected. Sending file manifest")

        manifest = build_manifest(file_path,file_id)
        manifest["target"] = target_peer_id
        await ws.send(json.dumps(manifest))

        for chunk in chunk_file(file_path,file_id):
            encoded = base64.b64encode(chunk.data).decode()
            msg = {
                "type":        "file_chunk",
                "target":      target_peer_id,
                "fileId":      file_id,
                "chunkIndex":  chunk.index,
                "totalChunks": chunk.total,
                "data":        encoded,
                "hash":        chunk.hash,
            }
            await ws.send(json.dump(msg))

            pct = int(((chunk.index + 1) / chunk.total)*100)

            if on_progress:
                on_progress(pct,chunk.index +1,chunk.total)

            await asyncio.sleep(0.005)

        await ws.send(json.dumps({
            "type": "file_complete",
            "target": target_peer_id,
            "fileId": file_id
        }))

        logger.info("✓ File sent successfully")
        return file_id
