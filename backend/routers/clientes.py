from fastapi import APIRouter, HTTPException
from database import supabase
from schemas.credito import ClienteCreate

router = APIRouter(
    prefix="/clientes",
    tags=["clientes"],
)


@router.get("")
async def listar_clientes():
    """Retorna todos los clientes ordenados por nombre."""
    try:
        response = supabase.table("clientes").select("*").order("nombre").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("")
async def crear_cliente(cliente: ClienteCreate):
    """Crea un nuevo cliente."""
    try:
        payload = cliente.model_dump()
        response = supabase.table("clientes").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudo crear el cliente.")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
