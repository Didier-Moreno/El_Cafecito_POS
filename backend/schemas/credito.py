from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Clientes ──────────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = None


class Cliente(ClienteCreate):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Créditos ──────────────────────────────────────────────────────────────────

class CreditoCreate(BaseModel):
    cliente_id: int
    venta_id: Optional[int] = None
    total: float
    nota: Optional[str] = None


class Credito(BaseModel):
    id: int
    cliente_id: int
    venta_id: Optional[int] = None
    total: float
    saldo_pendiente: float
    estado: str
    nota: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Pagos parciales ───────────────────────────────────────────────────────────

class PagoCreditoCreate(BaseModel):
    monto: float
    nota: Optional[str] = None


class PagoCredito(PagoCreditoCreate):
    id: int
    credito_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
