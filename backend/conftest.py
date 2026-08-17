# Fija la DB de test ANTES de cualquier import de "app": Settings() se crea
# apenas se importa app.core.config, y a partir de ahi el connection string
# queda fijo. Si esto corriera despues del import, ya seria tarde y los
# tests terminarian pegandole a la Supabase real del .env.
import os

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://innovalab:innovalab@localhost:5433/innovalab_test"
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401 - registra todas las tablas en Base.metadata
from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app as fastapi_app


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    # Cada test corre dentro de una transaccion que se revierte al final,
    # asi un test nunca ve datos que dejo otro (sin tener que borrar tablas
    # a mano entre tests).
    connection = engine.connect()
    transaction = connection.begin()
    # join_transaction_mode="create_savepoint": el session corre dentro de un
    # SAVEPOINT propio. Si un test dispara un IntegrityError (esperado, por
    # ejemplo al probar un constraint UNIQUE) el rollback automatico solo
    # deshace el savepoint, no la transaccion externa de "transaction" - asi
    # el rollback() del teardown de abajo sigue teniendo algo valido que
    # deshacer.
    TestingSession = sessionmaker(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint",
    )
    session = TestingSession()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def _get_db_override():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _get_db_override
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()
