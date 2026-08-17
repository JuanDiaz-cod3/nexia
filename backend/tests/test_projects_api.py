from app.core.jwt import create_access_token
from app.models import AcademicYear, Project, ProjectMember, School, User


def test_create_project_conflicts_when_already_in_project_this_year(client, db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()

    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()

    student = User(
        school_id=school.id,
        full_name="Estudiante Prueba",
        username="jdiaz",
        email="jdiaz@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(student)
    db_session.flush()

    existing_project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto existente")
    db_session.add(existing_project)
    db_session.flush()
    db_session.add(
        ProjectMember(
            project_id=existing_project.id,
            user_id=student.id,
            academic_year_id=academic_year.id,
        )
    )
    db_session.commit()

    token = create_access_token(student.id)

    response = client.post(
        "/api/v1/projects",
        json={"title": "Proyecto nuevo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "already_in_project"


def test_list_projects_is_public(client, db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()

    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()

    db_session.add(Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto público"))
    db_session.commit()

    # Sin header Authorization: el archivo de proyectos esta abierto a todo
    # el mundo (ver CLAUDE.md), no debe pedir login.
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    assert any(p["title"] == "Proyecto público" for p in response.json())
