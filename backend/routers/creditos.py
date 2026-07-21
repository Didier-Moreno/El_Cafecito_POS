from fastapi import APIRouter, HTTPException
from database import supabase
from schemas.credito import CreditoCreate, PagoCreditoCreate

router = APIRouter(
    prefix="/creditos",
    tags=["creditos"],
)


@router.get("")
async def listar_creditos():
    """
    Retorna todos los créditos con datos del cliente anidados.
    Incluye también los pagos registrados de cada crédito.
    """
    try:
        response = (
            supabase.table("creditos")
            .select("*, clientes(id, nombre, telefono), pagos_credito(*)")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cliente/{cliente_id}")
async def creditos_por_cliente(cliente_id: int):
    """Retorna todos los créditos de un cliente específico."""
    try:
        response = (
            supabase.table("creditos")
            .select("*, pagos_credito(*)")
            .eq("cliente_id", cliente_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("")
async def crear_credito(credito: CreditoCreate):
    """
    Crea un nuevo crédito.
    El saldo_pendiente inicial es igual al total.
    El estado inicial es 'Pendiente'.
    """
    try:
        payload = {
            "cliente_id":      credito.cliente_id,
            "venta_id":        credito.venta_id,
            "total":           credito.total,
            "saldo_pendiente": credito.total,
            "estado":          "Pendiente",
            "nota":            credito.nota,
        }
        response = supabase.table("creditos").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudo crear el crédito.")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{credito_id}/pagos")
async def registrar_pago(credito_id: int, pago: PagoCreditoCreate):
    """
    Registra un pago parcial o total sobre un crédito.
    - Valida que el monto no supere el saldo pendiente.
    - Descuenta el monto del saldo_pendiente.
    - Si el saldo llega a 0, el estado pasa a 'Pagado'.
    """
    try:
        # 1. Obtener el crédito actual
        credito_resp = (
            supabase.table("creditos")
            .select("id, saldo_pendiente, estado")
            .eq("id", credito_id)
            .single()
            .execute()
        )
        if not credito_resp.data:
            raise HTTPException(status_code=404, detail="Crédito no encontrado.")

        credito = credito_resp.data
        if credito["estado"] == "Pagado":
            raise HTTPException(status_code=400, detail="Este crédito ya fue pagado.")

        saldo_actual = float(credito["saldo_pendiente"])
        if pago.monto > saldo_actual:
            raise HTTPException(
                status_code=400,
                detail=f"El monto ({pago.monto}) supera el saldo pendiente ({saldo_actual})."
            )

        # 2. Insertar el pago
        pago_payload = {
            "credito_id": credito_id,
            "monto":      pago.monto,
            "nota":       pago.nota,
        }
        supabase.table("pagos_credito").insert(pago_payload).execute()

        # 3. Actualizar saldo y estado del crédito
        nuevo_saldo = round(saldo_actual - pago.monto, 2)
        nuevo_estado = "Pagado" if nuevo_saldo <= 0 else "Pendiente"

        actualizado = (
            supabase.table("creditos")
            .update({"saldo_pendiente": nuevo_saldo, "estado": nuevo_estado})
            .eq("id", credito_id)
            .execute()
        )

        return {
            "success": True,
            "saldo_pendiente": nuevo_saldo,
            "estado": nuevo_estado,
            "credito": actualizado.data[0] if actualizado.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{credito_id}")
async def eliminar_credito(credito_id: int):
    """Elimina un crédito y sus pagos asociados (CASCADE en BD)."""
    try:
        supabase.table("creditos").delete().eq("id", credito_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
