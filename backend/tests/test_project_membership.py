import pytest
from sqlalchemy.exc import IntegrityError

from app.models import AcademicYear, Project, ProjectMember, School, User


def _make_school(db_session) -> School:
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    return school


def _make_user(db_session, school: School, username: str) -> User:
    user = User(
        school_id=school.id,
        full_name=f"Estudiante {username}",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash="hash",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_project(db_session, school: School, academic_year: AcademicYear, title: str) -> Project:
    project = Project(school_id=school.id, academic_year_id=academic_year.id, title=title)
    db_session.add(project)
    db_session.flush()
    return project


def test_student_cannot_join_two_projects_in_same_academic_year(db_session):
    school = _make_school(db_session)
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()

    student = _make_user(db_session, school, "jdiaz")
    project_a = _make_project(db_session, school, academic_year, "Proyecto A")
    project_b = _make_project(db_session, school, academic_year, "Proyecto B")

    db_session.add(
        ProjectMember(
            project_id=project_a.id, user_id=student.id, academic_year_id=academic_year.id
        )
    )
    db_session.flush()

    db_session.add(
        ProjectMember(
            project_id=project_b.id, user_id=student.id, academic_year_id=academic_year.id
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_student_can_join_projects_in_different_academic_years(db_session):
    school = _make_school(db_session)
    year_2025 = AcademicYear(school_id=school.id, name="2025")
    year_2026 = AcademicYear(school_id=school.id, name="2026")
    db_session.add_all([year_2025, year_2026])
    db_session.flush()

    student = _make_user(db_session, school, "jdiaz")
    project_2025 = _make_project(db_session, school, year_2025, "Proyecto 2025")
    project_2026 = _make_project(db_session, school, year_2026, "Proyecto 2026")

    db_session.add_all(
        [
            ProjectMember(
                project_id=project_2025.id, user_id=student.id, academic_year_id=year_2025.id
            ),
            ProjectMember(
                project_id=project_2026.id, user_id=student.id, academic_year_id=year_2026.id
            ),
        ]
    )

    db_session.flush()  # no debe lanzar
