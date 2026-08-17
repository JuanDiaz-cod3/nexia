# Script de un solo uso (o para re-sembrar en desarrollo): crea el primer
# usuario admin para poder probar el login. No es parte de la API.
# Se corre desde backend/ con: ./.venv/Scripts/python.exe -m scripts.create_admin

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, User, UserRole, School

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@lasalle.edu.co"
# Password temporal: must_change_password ya viene en True por default de la
# tabla (server_default), asi que al primer login se debe forzar el cambio.
ADMIN_PASSWORD = "CambiaEsto123"


def main() -> None:
    db = SessionLocal()
    try:
        school = db.query(School).filter_by(name="La Salle").one()
        admin_role = db.query(Role).filter_by(name="admin").one()

        # Evita crear un admin duplicado si el script se corre mas de una vez.
        existing = (
            db.query(User)
            .filter_by(username=ADMIN_USERNAME, school_id=school.id)
            .first()
        )
        if existing:
            print("Ya existe un usuario admin, no se crea de nuevo.")
            return

        admin = User(
            school_id=school.id,
            full_name="Administrador InnovaLab",
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
        )
        db.add(admin)
        # flush() manda el INSERT a Postgres y nos deja leer admin.id (lo
        # asigna la secuencia SERIAL), pero todavia no cierra la transaccion.
        db.flush()

        db.add(UserRole(user_id=admin.id, role_id=admin_role.id))
        db.commit()

        print(f"Usuario admin creado: username={ADMIN_USERNAME} password={ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
