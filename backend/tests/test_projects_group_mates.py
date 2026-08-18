import pytest
from sqlalchemy.exc import IntegrityError

from app.core.jwt import create_access_token
from app.models import (
    AcademicYear,
    Project,
    ProjectMember,
    School,
    Section,
    StudentGroup,
    StudentGroupMember,
    User,
)


def _make_school_year_section(db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()
    section = Section(school_id=school.id, academic_year_id=academic_year.id, name="11°A")
    db_session.add(section)
    db_session.flush()
    return school, academic_year, section


def _make_student(db_session, school, section, username):
    user = User(
        school_id=school.id,
        section_id=section.id,
        full_name=f"Estudiante {username}",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(user)
    db_session.flush()
    return user


def test_creating_project_adds_group_mates_as_members(client, db_session):
    school, academic_year, section = _make_school_year_section(db_session)

    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()

    creator = _make_student(db_session, school, section, "creador")
    mate = _make_student(db_session, school, section, "companero")
    db_session.add_all(
        [
            StudentGroupMember(group_id=group.id, user_id=creator.id, academic_year_id=academic_year.id),
            StudentGroupMember(group_id=group.id, user_id=mate.id, academic_year_id=academic_year.id),
        ]
    )
    db_session.commit()

    token = create_access_token(creator.id)
    response = client.post(
        "/api/v1/projects",
        json={"title": "Proyecto en grupo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    member_ids = {m["id"] for m in response.json()["members"]}
    assert member_ids == {creator.id, mate.id}


def test_group_mate_already_in_another_project_is_skipped_not_fatal(client, db_session):
    school, academic_year, section = _make_school_year_section(db_session)

    group = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add(group)
    db_session.flush()

    creator = _make_student(db_session, school, section, "creador2")
    busy_mate = _make_student(db_session, school, section, "ocupado")
    db_session.add_all(
        [
            StudentGroupMember(group_id=group.id, user_id=creator.id, academic_year_id=academic_year.id),
            StudentGroupMember(group_id=group.id, user_id=busy_mate.id, academic_year_id=academic_year.id),
        ]
    )

    # busy_mate ya tiene su propio proyecto este año - no debería poder
    # agregarse a un segundo, pero tampoco debería tirar abajo la creación
    # del proyecto de "creador".
    other_project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Otro proyecto")
    db_session.add(other_project)
    db_session.flush()
    db_session.add(
        ProjectMember(project_id=other_project.id, user_id=busy_mate.id, academic_year_id=academic_year.id)
    )
    db_session.commit()

    token = create_access_token(creator.id)
    response = client.post(
        "/api/v1/projects",
        json={"title": "Proyecto del creador"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    member_ids = {m["id"] for m in response.json()["members"]}
    assert member_ids == {creator.id}


def test_project_section_id_copied_from_creator(client, db_session):
    school, academic_year, section = _make_school_year_section(db_session)
    creator = _make_student(db_session, school, section, "conseccion")
    db_session.commit()

    token = create_access_token(creator.id)
    response = client.post(
        "/api/v1/projects",
        json={"title": "Proyecto con seccion"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    created = db_session.get(Project, response.json()["id"])
    assert created.section_id == section.id


def test_student_group_member_unique_per_academic_year(db_session):
    school, academic_year, section = _make_school_year_section(db_session)
    group_a = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    group_b = StudentGroup(school_id=school.id, academic_year_id=academic_year.id, section_id=section.id)
    db_session.add_all([group_a, group_b])
    db_session.flush()

    student = _make_student(db_session, school, section, "dosgrupos")
    db_session.add(
        StudentGroupMember(group_id=group_a.id, user_id=student.id, academic_year_id=academic_year.id)
    )
    db_session.flush()

    db_session.add(
        StudentGroupMember(group_id=group_b.id, user_id=student.id, academic_year_id=academic_year.id)
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
