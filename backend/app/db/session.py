from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping: antes de reusar una conexion del pool, hace un chequeo
# liviano y la reemplaza si esta muerta. Necesario con Supabase (y poolers
# administrados en general): cierran conexiones inactivas del lado del
# servidor sin avisarle a SQLAlchemy, y sin esto el primer query despues
# de un rato sin actividad tira un error de conexion como el que vimos.
# pool_recycle: igual, pero de forma proactiva, antes de que el servidor
# decida cerrarla el.
engine = create_engine(settings.database_url, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
