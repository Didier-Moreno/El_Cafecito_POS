from pydantic import BaseModel
from typing import Optional
from datetime import date


class AperturaCajaCreate(BaseModel):
    """Payload para registrar/actualizar la apertura o cierre de caja de un día."""
    fecha: date
    dinero_inicial: float = 0.0
    dinero_contado: Optional[float] = None
    nota: Optional[str] = None


class CajaDiariaOut(BaseModel):
    id: int
    fecha: date
    dinero_inicial: float
    dinero_contado: Optional[float] = None
    nota: Optional[str] = None

    class Config:
        from_attributes = True
