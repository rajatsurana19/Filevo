import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from server.peer_manager import PeerManager


@pytest.fixture
def manager():
    return PeerManager()


def make_ws():
    ws = AsyncMock()
    ws.send_json = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_register_and_lookup(manager):
    ws = make_ws()
    await manager.register("filevo_aaa", ws)
    assert manager.exists("filevo_aaa")
    assert manager.get("filevo_aaa") is ws


@pytest.mark.asyncio
async def test_unregister(manager):
    ws = make_ws()
    await manager.register("filevo_bbb", ws)
    await manager.unregister("filevo_bbb")
    assert not manager.exists("filevo_bbb")
    assert manager.get("filevo_bbb") is None


@pytest.mark.asyncio
async def test_count(manager):
    assert manager.count() == 0
    await manager.register("filevo_1", make_ws())
    await manager.register("filevo_2", make_ws())
    assert manager.count() == 2
    await manager.unregister("filevo_1")
    assert manager.count() == 1


@pytest.mark.asyncio
async def test_list_peers(manager):
    await manager.register("filevo_x", make_ws())
    peers = manager.list_peers()
    assert len(peers) == 1
    assert peers[0]["peer_id"] == "filevo_x"
    assert "connected_at" in peers[0]


@pytest.mark.asyncio
async def test_unknown_peer_returns_none(manager):
    assert manager.get("filevo_nobody") is None