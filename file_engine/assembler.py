import os
import logging
from dataclasses import dataclass,field
from file_engine.hasher import hash_bytes,hash_file

logger = logging.getLogger("filevo.assembler")

@dataclass
class Transfer:
    file_id: str
    file_name: str
    file_size: str
    total_chunks: int
    chunks: dict = field(default_factory=dict)

    @property
    def received(self) -> int:
        return len(self.chunks)
    
    @property
    def progress(self) -> float:
        return (self.received / self.total_chunks) * 100 if self.total_chunks else 0
    
    @property
    def complete(self) -> bool:
        return self.received >= self.total_chunks
    

class Assembler:

    def __init__(self,output_dir: str ="."):
        self.output_dir = output_dir
        self._transfers: dict[str,Transfer] = {}

    def init_transfer(self,file_id: str, file_name: str, file_size: int, total_chunks: int) -> None:

        self._transfers[file_id] = Transfer(
            file_id= file_id,
            file_name= file_name,
            file_size= file_size,
            total_chunks= total_chunks,
        )
        logger.info(f"Transfer started: {file_name}  ({total_chunks} chunks)")

    def add_chunk(self,file_id: str,chunk_index: int,data:bytes) -> Transfer | None:
        t = self._transfers.get(file_id)
        if t is None:
            logger.warning(f"Chunk for unknown transfer: {file_id}")
            return None
        
        t.chunks[chunk_index] = data
        logger.debug(f" Chunk {chunk_index+1}/{t.total_chunks} for {t.file_name}")
        return t 
    
    def write(self,file_id: str) -> str:
        t = self._transfers.get(file_id)
        if t is None:
            raise ValueError(f" Unknown transfer: {file_id}")
        
        missing = [i for i in range(t.total_chunks) if i not in t.chunks]
        if missing:
            raise ValueError(f"Missing chunks for {t.file_name}: {missing}")
        
        out_path = self._safe_path(t.file_name)

        with open(out_path, "wb") as f:
            for i in range(t.total_chunks):
                f.write(t.chunks[i])

        actual_size = os.path.getsize(out_path)
        logger.info(f"✓ File saved: {out_path} ({actual_size:,} bytes)")

        del self._transfers[file_id]

        return out_path

    def _safe_path(self, file_name: str) -> str:
        base   = os.path.join(self.output_dir, file_name)
        if not os.path.exists(base):
            return base
        name, _, ext = file_name.rpartition(".")
        counter = 1
        while True:
            candidate = os.path.join(self.output_dir, f"{name}_{counter}.{ext}")
            if not os.path.exists(candidate):
                return candidate
            counter += 1
