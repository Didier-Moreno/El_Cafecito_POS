from pydantic import BaseModel
from typing import Optional, List


# ── Variantes ────────────────────────────────────────────────────────────────

class VarianteBase(BaseModel):
    nombre: str
    stock:  int = 0

class VarianteCreate(VarianteBase):
    pass

class VarianteUpdate(BaseModel):
    id:     Optional[int] = None   # None = nueva variante
    nombre: Optional[str] = None
    stock:  Optional[int] = None

class Variante(VarianteBase):
    id:         int
    producto_id: int

    class Config:
        from_attributes = True


# ── Productos ────────────────────────────────────────────────────────────────

class ProductoBase(BaseModel):
    nombre:          str
    precio:          float
    costo:           float = 0.0
    stock:           int   = 0
    categoria:       Optional[str]  = None
    is_favorite:     bool           = False
    tiene_variantes: bool           = False

class ProductoCreate(ProductoBase):
    variantes: Optional[List[VarianteCreate]] = None

class ProductoUpdate(BaseModel):
    nombre:          Optional[str]   = None
    precio:          Optional[float] = None
    costo:           Optional[float] = None
    stock:           Optional[int]   = None
    categoria:       Optional[str]   = None
    is_favorite:     Optional[bool]  = None
    tiene_variantes: Optional[bool]  = None
    variantes:       Optional[List[VarianteUpdate]] = None

class Producto(ProductoBase):
    id:                 int
    producto_variantes: Optional[List[Variante]] = None

    class Config:
        from_attributes = True
