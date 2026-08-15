from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Una sola instancia reusada por toda la app: guarda los parametros de costo
# (memoria/iteraciones/paralelismo). El resto del proyecto nunca importa
# PasswordHasher directamente, solo las dos funciones de abajo.
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    # verify() de argon2 lanza una excepcion si no coincide, en vez de
    # devolver False. La normalizamos a bool para que quien llame esta
    # funcion no tenga que conocer excepciones especificas de argon2.
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False
