from fastapi import APIRouter, HTTPException
from schemas.caja import AperturaCajaCreate
from database import supabase

router = APIRouter(
    prefix="/reportes",
    tags=["reportes"]
)

@router.get("")
async def obtener_reportes(
    fecha_inicio: str = None, 
    fecha_fin: str = None,
    categoria: str = None,
    producto_id: int = None
):
    try:
        # Si se envían fechas de filtro, usar la nueva función parametrizada
        if fecha_inicio and fecha_fin:
            # Asegurar que cubran todo el día en hora local (Colombia -05:00)
            inicio_tz = f"{fecha_inicio} 00:00:00-05:00" if len(fecha_inicio) == 10 else fecha_inicio
            fin_tz = f"{fecha_fin} 23:59:59-05:00" if len(fecha_fin) == 10 else fecha_fin
            
            rpc_params = {
                "p_fecha_inicio": inicio_tz, 
                "p_fecha_fin": fin_tz
            }
            if categoria:
                rpc_params["p_categoria"] = categoria
            if producto_id:
                rpc_params["p_producto_id"] = producto_id
                
            response = supabase.rpc(
                "obtener_reportes_filtrados",
                rpc_params
            ).execute()
        else:
            # Mantener compatibilidad llamando a la función por defecto sin parámetros
            response = supabase.rpc("obtener_reportes").execute()
        
        # Manejo de errores
        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))
            
        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudieron cargar los reportes.")
            
        return response.data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener reportes: {str(e)}")


@router.get("/operacional")
async def obtener_reporte_operacional(fecha: str = None):
    """Retorna KPIs operacionales del día: ventas, producto top, hora pico y detalle."""
    try:
        from datetime import date as dt_date
        fecha_param = fecha if fecha else str(dt_date.today())

        response = supabase.rpc(
            "obtener_reporte_operacional",
            {"p_fecha": fecha_param}
        ).execute()

        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))

        if not response.data:
            raise HTTPException(status_code=400, detail="Sin datos para esa fecha.")

        return response.data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener reporte operacional: {str(e)}")


@router.get("/flujo-caja")
async def obtener_flujo_caja(fecha: str = None):
    """Retorna el flujo de caja completo para una fecha (entradas, salidas, caja esperada)."""
    try:
        from datetime import date as dt_date
        fecha_param = fecha if fecha else str(dt_date.today())

        response = supabase.rpc(
            "obtener_flujo_caja",
            {"p_fecha": fecha_param}
        ).execute()

        if hasattr(response, 'error') and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))

        # La RPC siempre retorna datos (aunque sea con ceros)
        if response.data is None:
            raise HTTPException(status_code=400, detail="Sin datos para esa fecha.")

        return response.data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener flujo de caja: {str(e)}")


@router.post("/flujo-caja/apertura")
async def guardar_apertura_caja(payload: AperturaCajaCreate):
    """Crea o actualiza el registro de caja_diaria para la fecha indicada (upsert)."""
    try:
        data = {
            "fecha":           str(payload.fecha),
            "dinero_inicial":  payload.dinero_inicial,
            "nota":            payload.nota,
        }
        if payload.dinero_contado is not None:
            data["dinero_contado"] = payload.dinero_contado

        response = (
            supabase.table("caja_diaria")
            .upsert(data, on_conflict="fecha")
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=400, detail="No se pudo guardar la apertura de caja.")

        return response.data[0]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al guardar apertura de caja: {str(e)}")
