# Centraliza las flags de las cookies de auth (httponly/secure/samesite)
# para no repetirlas en cada endpoint que las setea o las borra - y para
# que el criterio de "segun el ambiente" viva en un solo lugar.

from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _flags() -> dict:
    # production: Secure=true + SameSite=None, necesario para que la
    # cookie viaje entre dominios distintos (Vercel <-> Render). Local:
    # Secure=true rompe todo (el navegador no guarda cookies Secure sobre
    # HTTP) - Secure=false + SameSite=Lax alcanza porque localhost:5173 y
    # localhost:8000 son "same-site" para el navegador (el chequeo de
    # SameSite ignora el puerto).
    is_production = settings.environment == "production"
    return {
        "httponly": True,
        "secure": is_production,
        "samesite": "none" if is_production else "lax",
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    set_access_cookie(response, access_token)
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **_flags(),
    )


def set_access_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **_flags(),
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, **_flags())
    response.delete_cookie(REFRESH_COOKIE_NAME, **_flags())
