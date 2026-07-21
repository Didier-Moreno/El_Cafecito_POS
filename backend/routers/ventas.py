from fastapi import APIRouter, HTTPException
from database import supabase
from schemas.venta import VentaCreate

router = APIRouter(
    prefix="/ventas",
    tags=["ventas"]
)

@router.post("")
async def procesar_venta(venta: VentaCreate):
    # Convertir a diccionarios para serialización JSON
    items_dict = [item.model_dump() for item in venta.items]
    
    try:
        # Invocar la función RPC en Supabase
        response = supabase.rpc(
            "procesar_venta",
            {"p_items": items_dict, "p_total": venta.total}
        ).execute()
        
        # Algunas versiones de supabase devuelven un error en una propiedad 'error' u omiten la 'data'.
        # Manejo estándar según cómo responde supabase:
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))
        
        # Si la data está vacía, algo pudo fallar
        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudo procesar la venta.")
            
        # Verificar campo success si lo configuramos en el RPC
        if isinstance(response.data, dict) and not response.data.get("success"):
            raise HTTPException(status_code=400, detail="Error en la base de datos al procesar venta.")

        return response.data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{venta_id}")
async def eliminar_venta(venta_id: int):
    try:
        response = supabase.rpc(
            "eliminar_venta",
            {"p_venta_id": venta_id}
        ).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))
            
        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudo eliminar la venta.")
            
        if isinstance(response.data, dict) and not response.data.get("success"):
            raise HTTPException(status_code=400, detail="Error en la base de datos al eliminar la venta.")
            
        return response.data
    except Exception as e:
        import traceback
        traceback.print_exc()
        msg = str(e)
        if "No se permite eliminar ventas de días anteriores" in msg:
            raise HTTPException(status_code=400, detail="No se permite eliminar ventas de días anteriores.")
        raise HTTPException(status_code=400, detail=msg)
