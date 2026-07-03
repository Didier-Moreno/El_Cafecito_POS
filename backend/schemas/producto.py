from pydantic import BaseModel
from typing import Optional

class ProductoBase(BaseModel):
    nombre: str
    precio: float
    costo: float = 0.0
    stock: int = 0
    categoria: Optional[str] = None
    is_favorite: bool = False

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    costo: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None
    is_favorite: Optional[bool] = None

class Producto(ProductoBase):
    id: int

    class Config:
        from_attributes = True
