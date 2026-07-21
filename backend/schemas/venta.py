from pydantic import BaseModel
from typing import List, Optional

class DetalleVentaCreate(BaseModel):
    producto_id: int
    variante_id: Optional[int] = None
    cantidad: int
    precio: float

class VentaCreate(BaseModel):
    total: float
    items: List[DetalleVentaCreate]
