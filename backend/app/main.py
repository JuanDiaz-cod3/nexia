from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.users import router as users_router

app = FastAPI(title="Nexia API")


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
