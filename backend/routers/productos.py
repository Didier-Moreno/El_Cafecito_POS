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
    # Obtener productos con sus variantes anidadas
    response = supabase.table("productos").select("*, producto_variantes(*)").execute()
    return response.data

@router.post("", response_model=Producto)
async def crear_producto(producto: ProductoCreate):
    # Separar las variantes del producto principal
    variantes_data = producto.variantes
    data = producto.model_dump(exclude={"variantes"})
    
    # Crear producto principal
    response = supabase.table("productos").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear producto")
    
    nuevo_producto = response.data[0]
    
    # Si tiene variantes, crearlas
    if data.get("tiene_variantes") and variantes_data:
        variantes_insert = []
        for v in variantes_data:
            v_dict = v.model_dump()
            v_dict["producto_id"] = nuevo_producto["id"]
            variantes_insert.append(v_dict)
            
        if variantes_insert:
            supabase.table("producto_variantes").insert(variantes_insert).execute()
            
    # Retornar el producto completo con variantes
    return await get_producto_por_id(nuevo_producto["id"])

@router.put("/{producto_id}", response_model=Producto)
async def actualizar_producto(producto_id: int, producto: ProductoUpdate):
    variantes_data = producto.variantes
    data = producto.model_dump(exclude_unset=True, exclude={"variantes"})
    
    # Actualizar producto principal
    if data:
        response = supabase.table("productos").update(data).eq("id", producto_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
            
    # Gestionar variantes si el producto tiene variantes activadas
    if producto.tiene_variantes and variantes_data is not None:
        # Obtener variantes existentes
        existentes_res = supabase.table("producto_variantes").select("id").eq("producto_id", producto_id).execute()
        existentes_ids = [v["id"] for v in existentes_res.data]
        
        ids_recibidos = []
        nuevas = []
        actualizar = []
        
        for v in variantes_data:
            v_dict = v.model_dump(exclude_unset=True)
            v_dict["producto_id"] = producto_id
            
            if "id" in v_dict and v_dict["id"]:
                ids_recibidos.append(v_dict["id"])
                actualizar.append(v_dict)
            else:
                v_dict.pop("id", None)  # Asegurarse de quitar el ID para que Supabase lo genere
                nuevas.append(v_dict)
                
        # 1. Eliminar variantes que ya no están
        ids_eliminar = [eid for eid in existentes_ids if eid not in ids_recibidos]
        if ids_eliminar:
            supabase.table("producto_variantes").delete().in_("id", ids_eliminar).execute()
            
        # 2. Insertar nuevas
        if nuevas:
            supabase.table("producto_variantes").insert(nuevas).execute()
            
        # 3. Actualizar existentes
        for v in actualizar:
            v_id = v.pop("id")
            supabase.table("producto_variantes").update(v).eq("id", v_id).execute()
            
    # Si se desactiva tiene_variantes, eliminamos las variantes antiguas para limpieza (Opcional, pero recomendado)
    elif producto.tiene_variantes is False:
        supabase.table("producto_variantes").delete().eq("producto_id", producto_id).execute()
    
    return await get_producto_por_id(producto_id)

@router.delete("/{producto_id}")
async def eliminar_producto(producto_id: int):
    # La eliminación en cascada en la DB se encarga de producto_variantes
    response = supabase.table("productos").delete().eq("id", producto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": "Producto eliminado exitosamente"}

async def get_producto_por_id(producto_id: int):
    response = supabase.table("productos").select("*, producto_variantes(*)").eq("id", producto_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return response.data[0]
