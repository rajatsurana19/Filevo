import asyncio
import logging
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger("filevo.peers")


class PeerManager:
    def __init__(self):
        self._peers: dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def register(self, peer_id: str, ws: WebSocket) -> None:
        async with self._lock:
            if peer_id in self._peers:
                logger.warning(f"Peer {peer_id} reconnected — replacing old socket")
            self._peers[peer_id] = {
                "ws": ws,
                "connected_at": datetime.utcnow(),
            }
            logger.info(f"✓ Peer registered: {peer_id}  (total: {len(self._peers)})")

    async def unregister(self, peer_id: str) -> None:
        async with self._lock:
            if peer_id in self._peers:
                del self._peers[peer_id]
                logger.info(f"✗ Peer left: {peer_id}  (total: {len(self._peers)})")

    def get(self, peer_id: str) -> WebSocket | None:
        entry = self._peers.get(peer_id)
        return entry["ws"] if entry else None

    def exists(self, peer_id: str) -> bool:
        return peer_id in self._peers

    def count(self) -> int:
        return len(self._peers)

    def list_peers(self) -> list[dict]:
        return [
            {"peer_id": pid, "connected_at": info["connected_at"].isoformat()}
            for pid, info in self._peers.items()
        ]


peer_manager = PeerManager()