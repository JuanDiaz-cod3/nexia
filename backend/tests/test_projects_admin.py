from app.core.jwt import create_access_token
from app.models import AcademicYear, Project, ProjectMember, Role, School, User, UserRole


def _make_school_and_year(db_session) -> tuple[School, AcademicYear]:
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()
    return school, academic_year


def _make_user(db_session, school: School, username: str) -> User:
    user = User(
        school_id=school.id,
        full_name=f"Usuario {username}",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_admin(db_session, school: School, username: str) -> User:
    admin = _make_user(db_session, school, username)
    role = db_session.query(Role).filter_by(name="admin").first()
    if role is None:
        role = Role(name="admin")
        db_session.add(role)
        db_session.flush()
    db_session.add(UserRole(user_id=admin.id, role_id=role.id))
    db_session.flush()
    return admin


def _make_project_owned_by(db_session, school: School, academic_year: AcademicYear, owner: User) -> Project:
    project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto de otro estudiante")
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectMember(project_id=project.id, user_id=owner.id, academic_year_id=academic_year.id)
    )
    db_session.commit()
    return project


def test_admin_can_edit_project_they_do_not_belong_to(client, db_session):
    school, academic_year = _make_school_and_year(db_session)
    owner = _make_user(db_session, school, "estudiante")
    admin = _make_admin(db_session, school, "admin")
    project = _make_project_owned_by(db_session, school, academic_year, owner)

    token = create_access_token(admin.id)
    response = client.patch(
        f"/api/v1/projects/{project.id}",
        json={"title": "Editado por el admin"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Editado por el admin"


def test_admin_can_delete_project_they_do_not_belong_to(client, db_session):
    school, academic_year = _make_school_and_year(db_session)
    owner = _make_user(db_session, school, "estudiante")
    admin = _make_admin(db_session, school, "admin")
    project = _make_project_owned_by(db_session, school, academic_year, owner)

    token = create_access_token(admin.id)
    response = client.delete(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204


def test_non_member_non_admin_cannot_edit_project(client, db_session):
    school, academic_year = _make_school_and_year(db_session)
    owner = _make_user(db_session, school, "estudiante")
    outsider = _make_user(db_session, school, "otro-estudiante")
    project = _make_project_owned_by(db_session, school, academic_year, owner)

    token = create_access_token(outsider.id)
    response = client.patch(
        f"/api/v1/projects/{project.id}",
        json={"title": "No deberia poder"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "not_a_member"
