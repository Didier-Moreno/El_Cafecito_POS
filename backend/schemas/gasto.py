from pydantic import BaseModel
from typing import Optional
from datetime import date

class GastoBase(BaseModel):
    concepto: str
    proveedor: Optional[str] = None
    categoria: str
    valor: float
    fecha_gasto: Optional[date] = None
    fecha_pago: Optional[date] = None
    estado: str = 'Pendiente'  # Pendiente, Pagado, Cancelado
    observaciones: Optional[str] = None

class GastoCreate(GastoBase):
    pass

class GastoUpdate(BaseModel):
    concepto: Optional[str] = None
    proveedor: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[float] = None
    fecha_gasto: Optional[date] = None
    fecha_pago: Optional[date] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None

class Gasto(GastoBase):
    id: int

    class Config:
        from_attributes = True
