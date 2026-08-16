from fastapi import APIRouter, HTTPException
from database import supabase
from schemas.credito import CreditoCreate, PagoCreditoCreate, DeudaAnteriorCreate

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


@router.post("/deuda-anterior")
async def registrar_deuda_anterior(payload: DeudaAnteriorCreate):
    """
    Registra un pago de una deuda anterior al sistema.
    - Crea o asocia el cliente.
    - Crea un crédito marcado como 'Pagado'.
    - Crea el pago en pagos_credito para que cuente como entrada de dinero en la fecha indicada.
    """
    try:
        cliente_id = payload.cliente_id
        if not cliente_id and payload.cliente_nombre:
            nombre = payload.cliente_nombre.strip()
            cli_resp = (
                supabase.table("clientes")
                .select("id")
                .ilike("nombre", nombre)
                .execute()
            )
            if cli_resp.data and len(cli_resp.data) > 0:
                cliente_id = cli_resp.data[0]["id"]
            else:
                nuevo_cli = (
                    supabase.table("clientes")
                    .insert({"nombre": nombre})
                    .execute()
                )
                if nuevo_cli.data:
                    cliente_id = nuevo_cli.data[0]["id"]

        if not cliente_id:
            raise HTTPException(status_code=400, detail="Debe especificar un cliente o ingresar su nombre.")

        import datetime
        fecha_eval = payload.fecha or str(datetime.date.today())

        # Validar si la caja ya está cerrada para esa fecha
        caja_check = (
            supabase.table("caja_diaria")
            .select("dinero_contado")
            .eq("fecha", str(fecha_eval))
            .execute()
        )
        if caja_check.data and len(caja_check.data) > 0 and caja_check.data[0].get("dinero_contado") is not None:
            raise HTTPException(
                status_code=400,
                detail=f"La caja del día {fecha_eval} ya se encuentra cerrada. No es posible registrar pagos de deuda anterior con la caja cerrada."
            )

        if payload.fecha:
            now_time = datetime.datetime.now().strftime("%H:%M:%S")
            tz_created_at = f"{payload.fecha} {now_time}-05:00"
        else:
            tz_created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 1. Crear crédito pagado
        credito_payload = {
            "cliente_id": cliente_id,
            "venta_id": None,
            "total": payload.monto,
            "saldo_pendiente": 0,
            "estado": "Pagado",
            "nota": payload.nota or "Deuda anterior al sistema",
            "created_at": tz_created_at,
        }
        cred_resp = supabase.table("creditos").insert(credito_payload).execute()
        if not cred_resp.data:
            raise HTTPException(status_code=400, detail="No se pudo crear el registro de crédito.")

        credito_id = cred_resp.data[0]["id"]

        # 2. Crear pago en pagos_credito
        pago_payload = {
            "credito_id": credito_id,
            "monto": payload.monto,
            "nota": payload.nota or "Cobro deuda anterior",
            "created_at": tz_created_at,
        }
        pago_resp = supabase.table("pagos_credito").insert(pago_payload).execute()

        return {
            "success": True,
            "credito": cred_resp.data[0],
            "pago": pago_resp.data[0] if pago_resp.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

