from app.core.jwt import create_access_token
from app.models import AcademicYear, Role, School, Section, StudentGroup, StudentGroupMember, User, UserRole


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


def test_admin_has_no_section_or_group(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = User(
        school_id=school.id,
        full_name="Admin",
        username="admin",
        email="admin@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(admin)
    db_session.flush()
    role = _ensure_role(db_session, "admin")
    db_session.add(UserRole(user_id=admin.id, role_id=role.id))
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.get("/api/v1/users/me", cookies={"access_token": token})

    assert response.status_code == 200
    body = response.json()
    assert body["section_name"] is None
    assert body["group_label"] is None


def test_student_gets_section_and_per_section_group_number(client, db_session):
    school, academic_year = _make_school_year(db_session)
    section_a = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°A")
    section_b = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°B")
    db_session.add_all([section_a, section_b])
    db_session.flush()

    # Dos grupos en 11°A (para que el segundo NO sea "Grupo 1"), uno en 11°B.
    group_a1 = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section_a.id)
    group_a2 = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section_a.id)
    group_b1 = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section_b.id)
    db_session.add_all([group_a1, group_a2, group_b1])
    db_session.flush()

    student = User(
        school_id=school.id,
        section_id=section_a.id,
        full_name="Estudiante Prueba",
        username="estudianteprueba",
        email="estudianteprueba@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(student)
    db_session.flush()
    role = _ensure_role(db_session, "student")
    db_session.add(UserRole(user_id=student.id, role_id=role.id))
    db_session.add(
        StudentGroupMember(group_id=group_a2.id, user_id=student.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    token = create_access_token(student.id)
    response = client.get("/api/v1/users/me", cookies={"access_token": token})

    assert response.status_code == 200
    body = response.json()
    assert body["section_name"] == "11°A"
    # group_a2 es el 2do grupo creado en 11°A -> "Grupo 2", sin importar
    # que group_b1 (de otra seccion) tenga un id mas chico o mas grande.
    assert body["group_label"] == "Grupo 2"


def test_student_with_section_but_no_group_yet(client, db_session):
    school, academic_year = _make_school_year(db_session)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°C")
    db_session.add(section)
    db_session.flush()

    student = User(
        school_id=school.id,
        section_id=section.id,
        full_name="Sin Grupo",
        username="singrupo",
        email="singrupo@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(student)
    db_session.flush()
    role = _ensure_role(db_session, "student")
    db_session.add(UserRole(user_id=student.id, role_id=role.id))
    db_session.commit()

    token = create_access_token(student.id)
    response = client.get("/api/v1/users/me", cookies={"access_token": token})

    assert response.status_code == 200
    body = response.json()
    assert body["section_name"] == "11°C"
    assert body["group_label"] is None
