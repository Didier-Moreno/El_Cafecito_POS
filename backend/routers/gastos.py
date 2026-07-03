from fastapi import APIRouter, HTTPException
from typing import List
from database import supabase
from schemas.gasto import GastoCreate, GastoUpdate, Gasto

router = APIRouter(
    prefix="/gastos",
    tags=["gastos"]
)

@router.get("", response_model=List[Gasto])
async def obtener_gastos():
    response = supabase.table("gastos").select("*").order("id", desc=True).execute()
    return response.data

@router.get("/{gasto_id}", response_model=Gasto)
async def obtener_gasto(gasto_id: int):
    response = supabase.table("gastos").select("*").eq("id", gasto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return response.data[0]

@router.post("", response_model=Gasto)
async def crear_gasto(gasto: GastoCreate):
    data = gasto.model_dump()
    # Convertir fechas a string para JSON
    if data.get("fecha_gasto"):
        data["fecha_gasto"] = str(data["fecha_gasto"])
    if data.get("fecha_pago"):
        data["fecha_pago"] = str(data["fecha_pago"])
    response = supabase.table("gastos").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear gasto")
    return response.data[0]

@router.put("/{gasto_id}", response_model=Gasto)
async def actualizar_gasto(gasto_id: int, gasto: GastoUpdate):
    data = gasto.model_dump(exclude_unset=True)
    if data.get("fecha_gasto"):
        data["fecha_gasto"] = str(data["fecha_gasto"])
    if data.get("fecha_pago"):
        data["fecha_pago"] = str(data["fecha_pago"])
    response = supabase.table("gastos").update(data).eq("id", gasto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return response.data[0]

@router.delete("/{gasto_id}")
async def eliminar_gasto(gasto_id: int):
    response = supabase.table("gastos").delete().eq("id", gasto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return {"message": "Gasto eliminado exitosamente"}
