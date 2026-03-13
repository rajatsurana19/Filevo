import os
from dataclasses import dataclass
from file_engine.hasher import hash_bytes

DEFAULT_CHUNK_SIZE = 512 * 1024

@dataclass
class Chunk:
    index: int
    total: int
    data: bytes
    hash: str
    file_id: str
    file_name: str
    file_size: str

def chunk_file(
    path:str,
    file_id:str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
):
    if not os.path.exists(path):
        raise FileNotFoundError(f"FIle not found: {path}")
    
    file_name = os.path.basename(path)
    file_size = os.path.getsize(path)
    total = max(1,-(-file_size//chunk_size))

    with open(path,"rb") as f:
        index = 0
        while True:
            data = f.read(chunk_size)
            if not data:
                break
            yield Chunk(
                index= index,
                total= total,
                data= data,
                hash= hash_bytes(data),
                file_id= file_id,
                file_name= file_name,
                file_size= file_size,
            )
            index+=1

def build_manifest(path: str, file_id:str, chunk_size: int = DEFAULT_CHUNK_SIZE) -> dict:
    file_name = os.path.basename(path)
    file_size = os.path.getsize(path)
    total = max(1,-(-file_size//chunk_size))

    return{
        "type":        "file_manifest",
        "fileId":      file_id,
        "fileName":    file_name,
        "fileSize":    file_size,
        "totalChunks": total,
        "mimeType":    _guess_mime(file_name),
    }

def _guess_mime(name: str) -> str:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    mime_map = {
        "pdf": "application/pdf", "zip": "application/zip",
        "mp4": "video/mp4",       "mov": "video/quicktime",
        "mp3": "audio/mpeg",      "wav": "audio/wav",
        "jpg": "image/jpeg",      "jpeg": "image/jpeg",
        "png": "image/png",       "gif": "image/gif",
        "txt": "text/plain",      "html": "text/html",
        "json": "application/json",
    }
    return mime_map.get(ext, "application/octet-stream")