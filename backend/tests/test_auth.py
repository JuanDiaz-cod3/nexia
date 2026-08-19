from app.core.jwt import create_access_token, create_refresh_token
from app.core.security import hash_password
from app.models import AcademicYear, School, User


def _make_school_year(db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()
    return school, academic_year


def _make_user(db_session, school, *, username="estudiante", password="claveSegura123", must_change_password=False):
    user = User(
        school_id=school.id,
        full_name="Usuario de Prueba",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash=hash_password(password),
        must_change_password=must_change_password,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_login_with_correct_credentials_sets_auth_cookies(client, db_session):
    school, _ = _make_school_year(db_session)
    _make_user(db_session, school, username="juan", password="claveSegura123")

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "juan", "password": "claveSegura123"},
    )

    assert response.status_code == 200
    # Los tokens ya no viajan en el body - viajan como cookies httpOnly.
    assert "access_token" not in response.json()
    assert "refresh_token" not in response.json()
    assert response.json()["must_change_password"] is False
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


def test_login_with_nonexistent_user_returns_generic_401(client, db_session):
    _make_school_year(db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "no_existo", "password": "cualquiera"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_login_with_wrong_password_returns_same_generic_401(client, db_session):
    school, _ = _make_school_year(db_session)
    _make_user(db_session, school, username="juan", password="claveSegura123")

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "juan", "password": "claveIncorrecta"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_refresh_with_valid_refresh_token_sets_new_access_cookie(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan")

    refresh_token = create_refresh_token(user_id=user.id)
    response = client.post("/api/v1/auth/refresh", cookies={"refresh_token": refresh_token})

    assert response.status_code == 200
    assert "access_token" in response.cookies


def test_refresh_without_cookie_returns_401(client, db_session):
    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_refresh_token"


def test_refresh_with_garbage_token_returns_401(client, db_session):
    response = client.post("/api/v1/auth/refresh", cookies={"refresh_token": "esto-no-es-un-jwt"})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_refresh_token"


def test_refresh_rejects_an_access_token_used_as_refresh_token(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan")

    # create_access_token pone "type": "access" en el payload - el endpoint
    # de refresh exige "type": "refresh", asi que esto tiene que fallar
    # aunque la firma del JWT sea perfectamente valida.
    access_token = create_access_token(user_id=user.id)
    response = client.post("/api/v1/auth/refresh", cookies={"refresh_token": access_token})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_refresh_token"


# --- deps.py: la proteccion detras de todos los endpoints de arriba ---
# Usamos GET /users/me como endpoint protegido de referencia: pasa por
# require_password_changed, que a su vez depende de get_current_user, asi
# que un solo endpoint alcanza para probar las dos dependencias.


def test_garbage_access_cookie_is_rejected(client, db_session):
    response = client.get("/api/v1/users/me", cookies={"access_token": "esto-no-es-un-jwt"})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_missing_access_cookie_is_rejected(client, db_session):
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_deleted_user_with_still_valid_token_is_rejected(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan")
    token = create_access_token(user_id=user.id)

    # El token sigue siendo valido (firma y exp ok): lo que ya no existe es
    # el usuario al que apunta. get_current_user tiene que notar el
    # db.get(User, user_id) devolviendo None, no confiar ciegamente en el JWT.
    db_session.delete(user)
    db_session.commit()

    response = client.get("/api/v1/users/me", cookies={"access_token": token})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_user_with_pending_password_change_is_blocked_from_other_endpoints(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan", must_change_password=True)
    token = create_access_token(user_id=user.id)

    response = client.get("/api/v1/users/me", cookies={"access_token": token})

    assert response.status_code == 403
    assert response.json()["code"] == "password_change_required"


def test_change_password_with_correct_current_password_updates_hash_and_flag(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan", password="claveVieja123", must_change_password=True)
    token = create_access_token(user_id=user.id)

    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "claveVieja123", "new_password": "claveNueva456"},
        cookies={"access_token": token},
    )

    assert response.status_code == 200

    # Confirmamos el efecto real, no solo el 200: el login viejo ya no
    # sirve y el nuevo si, y must_change_password quedo en False.
    login_old = client.post("/api/v1/auth/login", json={"username": "juan", "password": "claveVieja123"})
    assert login_old.status_code == 401

    login_new = client.post("/api/v1/auth/login", json={"username": "juan", "password": "claveNueva456"})
    assert login_new.status_code == 200
    assert login_new.json()["must_change_password"] is False


def test_change_password_with_wrong_current_password_returns_401(client, db_session):
    school, _ = _make_school_year(db_session)
    user = _make_user(db_session, school, username="juan", password="claveVieja123")
    token = create_access_token(user_id=user.id)

    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "claveIncorrecta", "new_password": "claveNueva456"},
        cookies={"access_token": token},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"
