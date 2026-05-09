import sys
import time as _time
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db import Base, engine, SessionLocal
from app.api.routes import router
from app.api.auth import router as auth_router
from app.api.device_management import router as device_router
from app.api.users import router as users_router
from app.api.hikcentral import router as hikcentral_router
from app import state as _app_state

_app_state.STARTUP_TIME = _time.time()

Base.metadata.create_all(bind=engine)


def _seed_default_admin():
    from app.models import User
    from app.auth import hash_password

    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == 'admin').first():
            db.add(User(
                username='admin',
                hashed_password=hash_password('admin123'),
                role='admin',
                enabled=True,
            ))
            db.commit()
    finally:
        db.close()


_seed_default_admin()

app = FastAPI(title='Security Edge Gateway')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(device_router)
app.include_router(users_router)
app.include_router(hikcentral_router)


@app.get('/health')
def health():
    return {
        'status': 'ok',
    }


# ── Serve built React frontend ────────────────────────────────────────────────
# Resolve the frontend/dist directory whether running normally or as a PyInstaller bundle.
if getattr(sys, 'frozen', False):
    # PyInstaller extracts data files to sys._MEIPASS.
    # The spec bundles static/frontend → static/frontend inside the bundle.
    _STATIC_DIR = Path(sys._MEIPASS) / 'static' / 'frontend'
else:
    # Dev: vite builds into backend/static/frontend
    _STATIC_DIR = Path(__file__).parent.parent / 'static' / 'frontend'

if _STATIC_DIR.exists():
    # Serve hashed JS/CSS/image assets (only mount if the folder exists)
    _assets_dir = _STATIC_DIR / 'assets'
    if _assets_dir.exists():
        app.mount('/assets', StaticFiles(directory=_assets_dir), name='assets')

    @app.get('/{full_path:path}', include_in_schema=False)
    def serve_spa(full_path: str):
        """Serve static files or fall back to index.html for SPA routing."""
        file = _STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_STATIC_DIR / 'index.html')
