from app.core.jwt import create_access_token
from app.core.security import verify_password
from app.models import (
    AcademicYear,
    Role,
    School,
    Section,
    StudentGroupMember,
    User,
    UserRole,
)


def _make_school_year(db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()
    return school, academic_year


def _ensure_role(db_session, name):
    role = db_session.query(Role).filter_by(name=name).first()
    if role is None:
        role = Role(name=name)
        db_session.add(role)
        db_session.flush()
    return role


def _make_admin(db_session, school):
    admin = User(
        school_id=school.id,
        full_name="Admin Prueba",
        username="admin-prueba",
        email="admin-prueba@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(admin)
    db_session.flush()
    role = _ensure_role(db_session, "admin")
    db_session.add(UserRole(user_id=admin.id, role_id=role.id))
    db_session.flush()
    return admin


def _make_student(db_session, school):
    student = User(
        school_id=school.id,
        full_name="No Admin",
        username="noadmin",
        email="noadmin@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(student)
    db_session.commit()
    return student


def test_non_admin_cannot_create_student_group(client, db_session):
    school, _ = _make_school_year(db_session)
    student = _make_student(db_session, school)
    token = create_access_token(student.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={"students": [{"full_name": "X", "email": "x@lasalle.edu.co", "section_name": "11°A"}]},
        cookies={"access_token": token},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "admin_required"


def test_admin_creates_group_with_generated_credentials(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    _ensure_role(db_session, "student")
    db_session.commit()
    token = create_access_token(admin.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={
            "students": [
                {
                    "full_name": "Estudiante Uno",
                    "email": "estudiante.uno@lasalle.edu.co",
                    "section_name": "11°A",
                },
                {
                    "full_name": "Estudiante Dos",
                    "email": "estudiante.dos@lasalle.edu.co",
                    "section_name": "11°A",
                },
            ],
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["section_name"] == "11°A"
    assert len(body["students"]) == 2

    usernames = {s["username"] for s in body["students"]}
    assert usernames == {"estudiante.uno", "estudiante.dos"}
    assert {s["section_name"] for s in body["students"]} == {"11°A"}

    # Las contraseñas vienen en texto plano en la respuesta (unica vez) -
    # confirmar que lo que se guardo es el HASH, no el texto plano.
    for student_out in body["students"]:
        user = db_session.get(User, student_out["id"])
        assert user.password_hash != student_out["temporary_password"]
        assert verify_password(student_out["temporary_password"], user.password_hash)
        assert user.must_change_password is True
        assert user.section_id == body["section_id"]
        role_names = [r.name for r in user.roles]
        assert role_names == ["student"]

    # Ambos quedaron en el mismo grupo (mismo group_id de la respuesta).
    member_group_ids = {
        m.group_id
        for m in db_session.query(StudentGroupMember)
        .filter(StudentGroupMember.user_id.in_([s["id"] for s in body["students"]]))
        .all()
    }
    assert member_group_ids == {body["group_id"]}


def test_group_mixes_students_from_different_sections(client, db_session):
    # El caso real que motivo este cambio: un grupo de proyecto con
    # integrantes de secciones distintas (ver CLAUDE.md, "Secciones y
    # grupos"). La seccion de referencia del grupo (body["section_id"]) es
    # la del primer estudiante, pero cada quien guarda la suya propia.
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    _ensure_role(db_session, "student")
    db_session.commit()
    token = create_access_token(admin.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={
            "students": [
                {"full_name": "De Once A", "email": "once.a@lasalle.edu.co", "section_name": "11°A"},
                {"full_name": "De Once B", "email": "once.b@lasalle.edu.co", "section_name": "11°B"},
            ],
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 201
    body = response.json()
    by_email = {s["email"]: s for s in body["students"]}
    assert by_email["once.a@lasalle.edu.co"]["section_name"] == "11°A"
    assert by_email["once.b@lasalle.edu.co"]["section_name"] == "11°B"

    student_a = db_session.get(User, by_email["once.a@lasalle.edu.co"]["id"])
    student_b = db_session.get(User, by_email["once.b@lasalle.edu.co"]["id"])
    assert student_a.section_id != student_b.section_id

    # El grupo mixto tiene que aparecer navegando CUALQUIERA de las dos
    # secciones, no solo la de referencia (section_id de la respuesta).
    section_a_id = student_a.section_id
    section_b_id = student_b.section_id
    for section_id in (section_a_id, section_b_id):
        listing = client.get(
            "/api/v1/admin/student-groups",
            params={"section_id": section_id},
            cookies={"access_token": token},
        )
        assert listing.status_code == 200
        assert body["group_id"] in {g["id"] for g in listing.json()}


def test_reuses_existing_section_instead_of_duplicating(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    _ensure_role(db_session, "student")
    db_session.commit()
    token = create_access_token(admin.id)

    payload = {
        "students": [{"full_name": "Solo", "email": "solo@lasalle.edu.co", "section_name": "11°B"}],
    }
    first = client.post(
        "/api/v1/admin/student-groups", json=payload, cookies={"access_token": token}
    )
    payload2 = {
        "students": [{"full_name": "Otro", "email": "otro@lasalle.edu.co", "section_name": "11°B"}],
    }
    second = client.post(
        "/api/v1/admin/student-groups", json=payload2, cookies={"access_token": token}
    )

    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["section_id"] == second.json()["section_id"]

    sections = db_session.query(Section).filter_by(school_id=school.id, name="11°B").all()
    assert len(sections) == 1


def test_username_collision_gets_suffixed(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    # Ya existe un "juan" en el colegio.
    existing = User(
        school_id=school.id,
        full_name="Juan Preexistente",
        username="juan",
        email="juan@otralasalle.edu.co",
        password_hash="hash",
    )
    db_session.add(existing)
    _ensure_role(db_session, "student")
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        "/api/v1/admin/student-groups",
        json={
            "students": [
                {"full_name": "Juan Nuevo", "email": "juan@lasalle.edu.co", "section_name": "11°C"}
            ]
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 201
    assert response.json()["students"][0]["username"] == "juan2"


def test_invalid_email_rejected(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    token = create_access_token(admin.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={"students": [{"full_name": "Malo", "email": "no-es-un-correo", "section_name": "11°A"}]},
        cookies={"access_token": token},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_email"


def test_invalid_section_rejected(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    token = create_access_token(admin.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={"students": [{"full_name": "Malo", "email": "malo@lasalle.edu.co", "section_name": "  "}]},
        cookies={"access_token": token},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_section"


def test_empty_student_list_rejected(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    token = create_access_token(admin.id)

    response = client.post(
        "/api/v1/admin/student-groups",
        json={"students": []},
        cookies={"access_token": token},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "empty_group"
