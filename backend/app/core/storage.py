# Cliente minimo para la API REST de Supabase Storage - se eligio httpx
# directo en vez del SDK oficial (supabase-py) porque ese paquete trae
# clientes de Auth/Realtime/Postgrest que no usamos (la app ya habla con
# Postgres directo via SQLAlchemy, no via Postgrest). Menos dependencia
# para una sola responsabilidad: subir, bajar y borrar bytes.

import httpx

from app.core.config import settings

BUCKET = "documents"


def _headers() -> dict[str, str]:
    # Supabase Storage exige los dos headers - "apikey" identifica el
    # proyecto, "Authorization" autoriza la operacion. Con solo uno de los
    # dos, la gateway devuelve 400 "Invalid Compact JWS" (probado en vivo).
    return {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }


def upload_file(storage_path: str, content: bytes, content_type: str) -> None:
    url = f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{storage_path}"
    response = httpx.post(
        url,
        headers={**_headers(), "Content-Type": content_type},
        content=content,
        timeout=30,
    )
    response.raise_for_status()


def delete_file(storage_path: str) -> None:
    url = f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{storage_path}"
    response = httpx.delete(url, headers=_headers(), timeout=30)
    response.raise_for_status()


def public_url(storage_path: str) -> str:
    # El bucket "documents" tiene que estar configurado como publico en el
    # dashboard de Supabase para que esta URL sirva sin autenticacion -
    # coherente con que GET /projects tampoco pide login (ver CLAUDE.md).
    return f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"
