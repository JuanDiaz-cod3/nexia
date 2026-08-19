from app.core.jwt import create_access_token
from app.models import AcademicYear, Document, Project, ProjectMember, Role, School, User, UserRole


def _make_school_year(db_session):
    school = School(name="Instituto La Salle", email_domain="lasalle.edu.co")
    db_session.add(school)
    db_session.flush()
    academic_year = AcademicYear(school_id=school.id, name="2026")
    db_session.add(academic_year)
    db_session.flush()
    return school, academic_year


def _make_user(db_session, school, *, username="estudiante"):
    user = User(
        school_id=school.id,
        full_name="Estudiante Prueba",
        username=username,
        email=f"{username}@lasalle.edu.co",
        password_hash="hash",
        must_change_password=False,
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_project_with_member(db_session, school, academic_year, member):
    project = Project(school_id=school.id, academic_year_id=academic_year.id, title="Proyecto de prueba")
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectMember(project_id=project.id, user_id=member.id, academic_year_id=academic_year.id)
    )
    db_session.commit()
    return project


def _ensure_role(db_session, name):
    role = db_session.query(Role).filter_by(name=name).first()
    if role is None:
        role = Role(name=name)
        db_session.add(role)
        db_session.flush()
    return role


def test_list_documents_is_public_and_empty_for_new_project(client, db_session):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school)
    project = _make_project_with_member(db_session, school, academic_year, member)

    # Sin header Authorization - listar documentos es publico, igual que
    # GET /projects (ver CLAUDE.md).
    response = client.get(f"/api/v1/projects/{project.id}/documents")

    assert response.status_code == 200
    assert response.json() == []


def test_list_documents_404_when_project_not_found(client, db_session):
    response = client.get("/api/v1/projects/999999/documents")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_upload_document_requires_membership_or_admin(client, db_session):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school, username="miembro")
    outsider = _make_user(db_session, school, username="ajeno")
    project = _make_project_with_member(db_session, school, academic_year, member)

    token = create_access_token(outsider.id)
    response = client.post(
        f"/api/v1/projects/{project.id}/documents",
        files={"file": ("informe.pdf", b"contenido falso", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "not_a_member"


def test_upload_document_rejects_disallowed_file_type(client, db_session, monkeypatch):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school)
    project = _make_project_with_member(db_session, school, academic_year, member)

    # No deberia ni llegar a llamar a Storage - si esto se ejecuta, el test
    # falla con un error mas claro que un intento real de red.
    monkeypatch.setattr(
        "app.core.storage.upload_file",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("no deberia subir un tipo invalido")),
    )

    token = create_access_token(member.id)
    response = client.post(
        f"/api/v1/projects/{project.id}/documents",
        files={"file": ("virus.exe", b"contenido falso", "application/x-msdownload")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_file_type"


def test_upload_document_rejects_file_over_25mb(client, db_session, monkeypatch):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school)
    project = _make_project_with_member(db_session, school, academic_year, member)

    monkeypatch.setattr(
        "app.core.storage.upload_file",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("no deberia subir un archivo demasiado grande")),
    )

    oversized = b"0" * (25 * 1024 * 1024 + 1)
    token = create_access_token(member.id)
    response = client.post(
        f"/api/v1/projects/{project.id}/documents",
        files={"file": ("informe.pdf", oversized, "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "file_too_large"


def test_upload_document_success_stores_row_and_calls_storage(client, db_session, monkeypatch):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school)
    project = _make_project_with_member(db_session, school, academic_year, member)

    calls = []
    monkeypatch.setattr(
        "app.core.storage.upload_file",
        lambda storage_path, content, content_type: calls.append((storage_path, content, content_type)),
    )
    monkeypatch.setattr("app.core.storage.public_url", lambda storage_path: f"https://fake.supabase.co/{storage_path}")

    token = create_access_token(member.id)
    response = client.post(
        f"/api/v1/projects/{project.id}/documents",
        files={"file": ("informe.pdf", b"contenido falso", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["file_name"] == "informe.pdf"
    assert body["file_type"] == "application/pdf"
    assert body["size_bytes"] == len(b"contenido falso")
    assert body["url"].startswith("https://fake.supabase.co/")

    # Se llamo a Storage exactamente una vez, con el contenido real.
    assert len(calls) == 1
    storage_path, content, content_type = calls[0]
    assert content == b"contenido falso"
    assert content_type == "application/pdf"
    assert storage_path.startswith(f"{project.id}/")
    assert storage_path.endswith(".pdf")

    # Y quedo un registro real en la DB, no solo la respuesta HTTP.
    document = db_session.query(Document).filter_by(project_id=project.id).first()
    assert document is not None
    assert document.storage_path == storage_path


def test_delete_document_requires_membership_or_admin(client, db_session, monkeypatch):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school, username="miembro")
    outsider = _make_user(db_session, school, username="ajeno")
    project = _make_project_with_member(db_session, school, academic_year, member)
    document = Document(
        project_id=project.id,
        file_name="informe.pdf",
        file_type="application/pdf",
        size_bytes=10,
        storage_path=f"{project.id}/algo.pdf",
        uploaded_by=member.id,
    )
    db_session.add(document)
    db_session.commit()

    monkeypatch.setattr(
        "app.core.storage.delete_file",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("no deberia borrar sin permiso")),
    )

    token = create_access_token(outsider.id)
    response = client.delete(
        f"/api/v1/documents/{document.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "not_a_member"


def test_admin_can_delete_document_on_project_they_do_not_belong_to(client, db_session, monkeypatch):
    school, academic_year = _make_school_year(db_session)
    member = _make_user(db_session, school, username="miembro")
    admin = _make_user(db_session, school, username="admin")
    role = _ensure_role(db_session, "admin")
    db_session.add(UserRole(user_id=admin.id, role_id=role.id))
    project = _make_project_with_member(db_session, school, academic_year, member)
    document = Document(
        project_id=project.id,
        file_name="informe.pdf",
        file_type="application/pdf",
        size_bytes=10,
        storage_path=f"{project.id}/algo.pdf",
        uploaded_by=member.id,
    )
    db_session.add(document)
    db_session.commit()

    calls = []
    monkeypatch.setattr("app.core.storage.delete_file", lambda storage_path: calls.append(storage_path))

    token = create_access_token(admin.id)
    response = client.delete(
        f"/api/v1/documents/{document.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204
    assert calls == [document.storage_path]
    assert db_session.query(Document).filter_by(id=document.id).first() is None
