import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.projects import router as projects_router
from app.api.v1.users import router as users_router
from app.core.config import settings

# Sin esto, los logger.warning(...) de auth.py/deps.py igual aparecerian
# (el "handler de ultimo recurso" de Python manda WARNING+ a stderr por
# default), pero sin timestamp ni nombre de logger - dificil de leer en
# los logs de Render/Railway. basicConfig le da formato una sola vez, al
# arrancar la app.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="InnovaLab API")

# Permite que el frontend (otro origen) llame a esta API desde el navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Cabeceras de seguridad basicas que FastAPI no manda por defecto (no hay
# equivalente a helmet() aca). No incluye HSTS a proposito: solo tiene
# sentido una vez que la app corra sobre HTTPS de verdad, y hoy sigue
# siendo local/HTTP (ver CLAUDE.md, deploy todavia no ejecutado).
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# Fuerza el formato de error estandar del CLAUDE.md ({"detail", "code"}) en
# TODOS los endpoints, sin tener que repetirlo en cada uno. Si un endpoint
# lanza HTTPException(detail="algo") con un string simple (no un dict con
# "code"), igual queda bien formado gracias al else de abajo.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        body = exc.detail
    else:
        body = {"detail": exc.detail, "code": "http_error"}
    return JSONResponse(status_code=exc.status_code, content=body)


app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
