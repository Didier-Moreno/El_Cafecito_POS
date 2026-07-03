import os
from supabase import create_client
from dotenv import load_dotenv

# Cargar variables de entorno desde .env, forzando sobreescribir 
# cualquier valor previo en la memoria para que tome la nueva clave
load_dotenv(override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    raise RuntimeError(
        "[El Cafecito] Faltan variables de entorno de Supabase. "
        "Asegúrate de definir SUPABASE_URL y SUPABASE_SERVICE_KEY en backend/.env"
    )

# Cliente con service_role — tiene acceso completo, bypassea RLS
# NUNCA usar esta clave en el frontend
supabase = create_client(url, key)
