from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    # Sin from_attributes=True a proposito: "url" no es una columna del
    # modelo, se calcula en el endpoint (storage.public_url) - este schema
    # siempre se construye a mano, nunca directo desde el ORM.
    id: int
    file_name: str
    file_type: str
    size_bytes: int
    uploaded_at: datetime
    url: str
