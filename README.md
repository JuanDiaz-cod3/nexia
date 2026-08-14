# Nexia

Plataforma web para colegios que gestiona el ciclo de vida completo de proyectos de investigación
de grado 11: registro, revisión, sustentación, evaluación por jurados, publicación de resultados y
archivo histórico. Piloto para un colegio de la comunidad La Salle, pensada desde el inicio para
poder evolucionar a un producto SaaS multi-colegio.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL
- **Storage:** Supabase Storage

## Requisitos

- Node.js 22+ y npm
- Python 3.12+

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env        # y completar valores reales

uvicorn app.main:app --reload
```

Disponible en `http://localhost:8000`. Healthcheck: `GET http://localhost:8000/api/v1/health`.
