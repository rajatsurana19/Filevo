import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI,WebSocket
from fastapi.middleware.cors import CORSMiddleware

from server.peer_manager import peer_manager
from server.relay import handle_peer

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL","info").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("filevo")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔗 Filevo relay server starting…")
    yield
    logger.info("🛑 Filevo relay server shutting down")

app = FastAPI(
    title="Filevo Relay",
    description="P2P file transfer relay - chunks travel through here",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

@app.get("/",tags=["health"])
async def root():
    return{
        "status" : "ok",
        "service" : "Filevo Relay",
        "peers" : peer_manager.count(),
    }

app.get("/peers",tags=["debug"])
async def list_peers():
    """Returns all currently connected peers. Useful during development."""
    return {
        "count": peer_manager.count(),
        "peers": peer_manager.list_peers(),
    }

@app.websocket("/ws/{peer_id}")
async def websocket_endpoint(ws: WebSocket, peer_id: str):
    if not peer_id or len(peer_id) > 64:
        await ws.close(code=1008, reason="Invalid peer ID")
        return

    await handle_peer(ws, peer_id)


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    logger.info(f"Starting on ws://{host}:{port}")
    uvicorn.run(
        "server.main:app",
        host=host,
        port=port,
        reload=True,
        log_level=LOG_LEVEL.lower(),
        ws_ping_interval=20,
        ws_ping_timeout=30,
    )