from app.core.jwt import create_access_token
from app.models import (
    AcademicYear,
    Project,
    ProjectMember,
    Role,
    School,
    Section,
    StudentGroup,
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


def _make_student(db_session, school, section, username, full_name=None):
    student = User(
        school_id=school.id,
        section_id=section.id,
        full_name=full_name or f"Estudiante {username}",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(student)
    db_session.flush()
    role = _ensure_role(db_session, "student")
    db_session.add(UserRole(user_id=student.id, role_id=role.id))
    db_session.flush()
    return student


def test_list_sections_and_groups(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°A")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()
    member = _make_student(db_session, school, section, "grupo1")
    db_session.add(
        StudentGroupMember(group_id=group.id, user_id=member.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    token = create_access_token(admin.id)

    sections_resp = client.get("/api/v1/admin/sections", cookies={"access_token": token})
    assert sections_resp.status_code == 200
    assert sections_resp.json() == [{"id": section.id, "name": "11°A"}]

    groups_resp = client.get(
        f"/api/v1/admin/student-groups?section_id={section.id}",
        cookies={"access_token": token},
    )
    assert groups_resp.status_code == 200
    body = groups_resp.json()
    assert len(body) == 1
    assert body[0]["section_name"] == "11°A"
    assert [s["username"] for s in body[0]["students"]] == ["grupo1"]


def test_search_students_flags_already_in_group(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°B")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()

    busy = _make_student(db_session, school, section, "busy.search", full_name="Busy Search")
    db_session.add(
        StudentGroupMember(group_id=group.id, user_id=busy.id, academic_year_id=academic_year.id)
    )
    free = _make_student(db_session, school, section, "free.search", full_name="Free Search")
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.get(
        "/api/v1/admin/students/search?q=search", cookies={"access_token": token}
    )

    assert response.status_code == 200
    by_username = {s["username"]: s for s in response.json()}
    assert by_username["busy.search"]["already_in_group"] is True
    assert by_username["free.search"]["already_in_group"] is False


def test_add_new_and_existing_members_to_group(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°C")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()
    original_member = _make_student(db_session, school, section, "original")
    db_session.add(
        StudentGroupMember(
            group_id=group.id, user_id=original_member.id, academic_year_id=academic_year.id
        )
    )
    free_student = _make_student(db_session, school, section, "libre")
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group.id}/members",
        json={
            "new_students": [
                {"full_name": "Nuevo Uno", "email": "nuevo.uno@lasalle.edu.co", "section_name": "11°C"}
            ],
            "existing_student_ids": [free_student.id],
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["added_new"]) == 1
    assert body["added_new"][0]["username"] == "nuevo.uno"
    assert body["added_new"][0]["section_name"] == "11°C"
    assert len(body["added_existing"]) == 1
    assert body["added_existing"][0]["id"] == free_student.id

    all_members = (
        db_session.query(StudentGroupMember).filter_by(group_id=group.id).all()
    )
    assert len(all_members) == 3


def test_add_new_member_from_different_section_to_existing_group(client, db_session):
    # Mismo caso real que test_group_mixes_students_from_different_sections,
    # pero por el camino de "agregar a grupo existente": un grupo ya
    # armado en 11°H puede sumar un estudiante NUEVO de 11°I sin que el
    # backend lo fuerce a la seccion de referencia del grupo.
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section_h = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°H")
    db_session.add(section_h)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section_h.id)
    db_session.add(group)
    db_session.flush()
    original_member = _make_student(db_session, school, section_h, "original.h")
    db_session.add(
        StudentGroupMember(
            group_id=group.id, user_id=original_member.id, academic_year_id=academic_year.id
        )
    )
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group.id}/members",
        json={
            "new_students": [
                {"full_name": "De Once I", "email": "once.i@lasalle.edu.co", "section_name": "11°I"}
            ],
            "existing_student_ids": [],
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["added_new"][0]["section_name"] == "11°I"
    # El grupo se sigue "archivando" bajo su seccion de referencia original
    # (11°H) - agregar un integrante nuevo no la cambia.
    assert body["section_name"] == "11°H"

    new_user = db_session.get(User, body["added_new"][0]["id"])
    assert new_user.section_id != section_h.id


def test_add_existing_member_already_in_another_group_conflicts(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°D")
    db_session.add(section)
    db_session.flush()
    group_a = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    group_b = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add_all([group_a, group_b])
    db_session.flush()

    already_busy = _make_student(db_session, school, section, "yaocupado")
    db_session.add(
        StudentGroupMember(group_id=group_a.id, user_id=already_busy.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group_b.id}/members",
        json={"new_students": [], "existing_student_ids": [already_busy.id]},
        cookies={"access_token": token},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "duplicate_student"

    # No debe haber quedado agregado a group_b (transaccion atomica).
    member_count_b = (
        db_session.query(StudentGroupMember).filter_by(group_id=group_b.id).count()
    )
    assert member_count_b == 0


def test_add_members_invalid_student_id_rejected(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°E")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group.id}/members",
        json={"new_students": [], "existing_student_ids": [999999]},
        cookies={"access_token": token},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_student"


def test_adding_members_to_group_with_existing_project_joins_them_to_it(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°F")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()

    founder = _make_student(db_session, school, section, "fundador")
    db_session.add(
        StudentGroupMember(group_id=group.id, user_id=founder.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    # El fundador ya creo su proyecto (como haria desde "Mi Proyecto") -
    # simulado directo en la DB, es el mismo efecto que POST /projects.
    project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto del grupo")
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectMember(project_id=project.id, user_id=founder.id, academic_year_id=academic_year.id)
    )
    free_student = _make_student(db_session, school, section, "librejoin")
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group.id}/members",
        json={
            "new_students": [
                {
                    "full_name": "Nuevo Integrante",
                    "email": "nuevo.integrante@lasalle.edu.co",
                    "section_name": "11°F",
                }
            ],
            "existing_student_ids": [free_student.id],
        },
        cookies={"access_token": token},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["added_to_project_id"] == project.id

    project_member_ids = {
        m.user_id for m in db_session.query(ProjectMember).filter_by(project_id=project.id).all()
    }
    new_user_id = body["added_new"][0]["id"]
    assert project_member_ids == {founder.id, free_student.id, new_user_id}


def test_adding_existing_member_already_in_other_project_skips_project_join_not_group(client, db_session):
    school, academic_year = _make_school_year(db_session)
    admin = _make_admin(db_session, school)
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°G")
    db_session.add(section)
    db_session.flush()
    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()

    founder = _make_student(db_session, school, section, "fundador2")
    db_session.add(
        StudentGroupMember(group_id=group.id, user_id=founder.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    project_a = Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto A")
    db_session.add(project_a)
    db_session.flush()
    db_session.add(
        ProjectMember(project_id=project_a.id, user_id=founder.id, academic_year_id=academic_year.id)
    )

    # busy_elsewhere ya tiene SU PROPIO proyecto (distinto), pero todavia no
    # esta en ningun grupo - se lo puede agregar al grupo igual, solo no
    # puede sumarse tambien al proyecto A.
    busy_elsewhere = _make_student(db_session, school, section, "busyelsewhere")
    other_project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Otro proyecto")
    db_session.add(other_project)
    db_session.flush()
    db_session.add(
        ProjectMember(
            project_id=other_project.id, user_id=busy_elsewhere.id, academic_year_id=academic_year.id
        )
    )
    db_session.commit()

    token = create_access_token(admin.id)
    response = client.post(
        f"/api/v1/admin/student-groups/{group.id}/members",
        json={"new_students": [], "existing_student_ids": [busy_elsewhere.id]},
        cookies={"access_token": token},
    )

    assert response.status_code == 200
    # Se agrego al grupo...
    group_member_ids = {
        m.user_id for m in db_session.query(StudentGroupMember).filter_by(group_id=group.id).all()
    }
    assert busy_elsewhere.id in group_member_ids
    # ...pero NO al proyecto A (ya tenia el suyo).
    project_a_member_ids = {
        m.user_id for m in db_session.query(ProjectMember).filter_by(project_id=project_a.id).all()
    }
    assert busy_elsewhere.id not in project_a_member_ids
