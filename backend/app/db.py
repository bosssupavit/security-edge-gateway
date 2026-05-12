import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


def _resolve_db_url(url: str) -> str:
    """Rewrite a relative sqlite:/// URL to be absolute when running as a frozen exe."""
    if url.startswith('sqlite:///') and not url.startswith('sqlite:////'):
        rel = url[len('sqlite:///'):]
        if getattr(sys, 'frozen', False):
            base = Path(sys.executable).parent
        else:
            base = Path.cwd()
        return 'sqlite:///' + str(base / rel)
    return url


engine = create_engine(
    _resolve_db_url(settings.database.url),
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
