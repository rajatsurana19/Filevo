import hashlib

def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def hash_file(path: str, chunk_size: int = 65536) -> str:

    h = hashlib.sha256()
    with open(path,"rb") as f:
        while True:
            block = f.read(chunk_size)
            if not block:
                break
            h.update(block)
    return h.hexdigest()

def verify_chunk(data: bytes,expected_hash: str) -> bool:
    return hash_bytes(data) == expected_hash
