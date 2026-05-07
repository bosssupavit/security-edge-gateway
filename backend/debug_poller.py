"""
Standalone poller for VS Code debugging.
Runs one poll cycle synchronously — set breakpoints in poller.py freely.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.db import SessionLocal
from app.services.poller import _sync_cameras, _sync_zk_devices

db = SessionLocal()
try:
    _sync_cameras(db)      # ← set breakpoint here
    _sync_zk_devices(db)   # ← or here
    db.commit()
    print('[debug] poll complete')
except Exception as e:
    print('[debug] error:', e)
    raise
finally:
    db.close()
