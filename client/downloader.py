import asyncio
import base64
import json
import random
import string
import logging
import os

import websockets

from file_engine.assembler import Assembler

logger = logging.getLogger("filevo.downloader")

WS_URL = "ws://localhost:8000/ws"
OUTPUT_DIR = "./received"


def _make_peer_id() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"fvo_{suffix}"


async def receive(
    ws_url: str = WS_URL,
    output_dir: str = OUTPUT_DIR,
    on_ready=None,
    on_progress=None,
    on_complete=None,
):
    os.makedirs(output_dir, exist_ok=True)

    peer_id = _make_peer_id()
    url = f"{ws_url}/{peer_id}"
    assembler = Assembler(output_dir)

    logger.info(f"Connecting as {peer_id}")

    async with websockets.connect(url) as ws:
        raw = await ws.recv()
        msg = json.loads(raw)
        if msg.get("type") != "connected":
            raise RuntimeError(f"Unexpected handshake: {msg}")

        logger.info(f"✓ Ready. Your Peer ID: {peer_id}")
        if on_ready:
            on_ready(peer_id)

        async def _ping():
            while True:
                await asyncio.sleep(15)
                await ws.send(json.dumps({"type": "ping"}))

        asyncio.create_task(_ping())

        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "file_manifest":
                assembler.init_transfer(
                    file_id=msg["fileId"],
                    file_name=msg["fileName"],
                    file_size=msg["fileSize"],
                    total_chunks=msg["totalChunks"],
                )

            elif msg_type == "file_chunk":
                file_id = msg["fileId"]
                chunk_index = msg["chunkIndex"]
                total = msg["totalChunks"]
                raw_data = base64.b64decode(msg["data"])

                transfer = assembler.add_chunk(file_id, chunk_index, raw_data)
                if transfer:
                    pct = int(((transfer.received) / total) * 100)
                    if on_progress:
                        on_progress(transfer.file_name, pct, transfer.received, total)

            elif msg_type == "file_complete":
                file_id = msg["fileId"]
                try:
                    out_path = assembler.write(file_id)
                    logger.info(f"✓ Saved: {out_path}")
                    if on_complete:
                        on_complete(out_path)
                except ValueError as e:
                    logger.error(f"Assembly failed: {e}")

            elif msg_type == "error":
                logger.warning(f"Relay error: {msg.get('message')}")

            elif msg_type == "pong":
                pass