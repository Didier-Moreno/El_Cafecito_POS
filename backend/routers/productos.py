from fastapi import APIRouter, HTTPException
from typing import List
from database import supabase
from schemas.producto import ProductoCreate, ProductoUpdate, Producto

router = APIRouter(
    prefix="/productos",
    tags=["productos"]
)

@router.get("", response_model=List[Producto])
async def obtener_productos():
    response = supabase.table("productos").select("*").execute()
    return response.data

@router.post("", response_model=Producto)
async def crear_producto(producto: ProductoCreate):
    data = producto.model_dump()
    response = supabase.table("productos").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear producto")
    return response.data[0]

@router.put("/{producto_id}", response_model=Producto)
async def actualizar_producto(producto_id: int, producto: ProductoUpdate):
    data = producto.model_dump(exclude_unset=True)
    response = supabase.table("productos").update(data).eq("id", producto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return response.data[0]

@router.delete("/{producto_id}")
async def eliminar_producto(producto_id: int):
    response = supabase.table("productos").delete().eq("id", producto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": "Producto eliminado exitosamente"}
