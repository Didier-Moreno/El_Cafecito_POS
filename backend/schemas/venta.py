from pydantic import BaseModel
from typing import List

class DetalleVentaCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio: float

class VentaCreate(BaseModel):
    total: float
    items: List[DetalleVentaCreate]
