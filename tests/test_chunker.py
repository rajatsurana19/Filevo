import os 
import tempfile
import pytest
from file_engine.chunker import chunk_file,build_manifest
from file_engine.hasher import hash_bytes

def make_temp_file(size_bytes: int) -> str:
    f = tempfile.NamedTemporaryFile(delete=False,suffix=".bin")
    f.write(bytes(range(256))*(size_bytes // 256)+b"\x00"*(size_bytes % 256))
    f.close()
    return f.name

def test_check_count_exact():
    path = make_temp_file(1024 * 512)  
    try:
        chunks = list(chunk_file(path, "test1", chunk_size=512 * 1024))
        assert len(chunks) == 1
        assert chunks[0].index == 0
        assert chunks[0].total == 1
    finally:
        os.unlink(path)

def test_chunk_count_multiple():
    path = make_temp_file(1024 * 1024 + 1)  
    try:
        chunks = list(chunk_file(path, "test2", chunk_size=512 * 1024))
        assert len(chunks) == 3
        assert chunks[-1].index == 2
        assert all(c.total == 3 for c in chunks)
    finally:
        os.unlink(path)


def test_chunk_hashes_correct():
    path = make_temp_file(1024)
    try:
        chunks = list(chunk_file(path, "test3", chunk_size=512))
        for chunk in chunks:
            assert chunk.hash == hash_bytes(chunk.data)
    finally:
        os.unlink(path)


def test_reassembly_matches_original():
    original = os.urandom(200_000)
    path = tempfile.NamedTemporaryFile(delete=False, suffix=".bin")
    path.write(original)
    path.close()
    try:
        chunks    = list(chunk_file(path.name, "test4", chunk_size=50_000))
        reassembled = b"".join(c.data for c in sorted(chunks, key=lambda c: c.index))
        assert reassembled == original
    finally:
        os.unlink(path.name)


def test_manifest_fields():
    path = make_temp_file(2048)
    try:
        m = build_manifest(path, "fid123", chunk_size=512)
        assert m["type"]        == "file_manifest"
        assert m["fileId"]      == "fid123"
        assert m["fileSize"]    == 2048
        assert m["totalChunks"] == 4
    finally:
        os.unlink(path)


def test_file_not_found():
    with pytest.raises(FileNotFoundError):
        list(chunk_file("/no/such/file.bin", "x"))