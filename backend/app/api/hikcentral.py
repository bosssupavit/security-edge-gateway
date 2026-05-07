from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import settings
from app.db import SessionLocal
from app.models import NvrStatus, CameraStatus
from app.services.hikcentral_client import HikCentralClient

router = APIRouter(prefix='/api/hikcentral', tags=['hikcentral'])


def _client() -> HikCentralClient:
    return HikCentralClient(
        base_url=settings.hikcentral.base_url,
        app_key=settings.hikcentral.app_key,
        app_secret=settings.hikcentral.app_secret,
    )


@router.get('/encode-devices')
def list_encode_devices(current_user=Depends(get_current_user)):
    """Get all NVR/DVR/encoder devices from HikCentral."""
    try:
        return _client().get_encode_devices()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── NVR endpoints ─────────────────────────────────────────────────────────────

@router.get('/nvr')
def list_nvr(current_user=Depends(get_current_user)):
    """List all NVR/encoder devices with camera counts from local DB."""
    db = SessionLocal()
    try:
        nvrs = db.query(NvrStatus).order_by(NvrStatus.id).all()
        result = []
        for nvr in nvrs:
            cam_count = db.query(CameraStatus).filter(
                CameraStatus.encode_dev_index_code == nvr.index_code
            ).count()
            result.append({
                'index_code': nvr.index_code,
                'name': nvr.name,
                'ip_address': nvr.ip_address,
                'port': nvr.port,
                'device_code': nvr.device_code,
                'treaty_type': nvr.treaty_type,
                'status': nvr.status,
                'online': nvr.online,
                'camera_count': cam_count,
                'updated_at': nvr.updated_at,
            })
        return result
    finally:
        db.close()


@router.get('/nvr/{index_code}')
def get_nvr(index_code: str, current_user=Depends(get_current_user)):
    """Get a single NVR with its cameras."""
    db = SessionLocal()
    try:
        nvr = db.query(NvrStatus).filter(NvrStatus.index_code == index_code).first()
        if not nvr:
            raise HTTPException(status_code=404, detail='NVR not found')

        cameras = db.query(CameraStatus).filter(
            CameraStatus.encode_dev_index_code == index_code
        ).order_by(CameraStatus.id).all()

        return {
            'index_code': nvr.index_code,
            'name': nvr.name,
            'ip_address': nvr.ip_address,
            'port': nvr.port,
            'device_code': nvr.device_code,
            'treaty_type': nvr.treaty_type,
            'status': nvr.status,
            'online': nvr.online,
            'updated_at': nvr.updated_at,
            'cameras': [
                {
                    'index_code': c.index_code,
                    'name': c.camera_name,
                    'status': c.status,
                    'online': c.online,
                    'capability_set': c.capability_set,
                    'record_type': c.record_type,
                    'record_location': c.record_location,
                    'updated_at': c.updated_at,
                }
                for c in cameras
            ],
        }
    finally:
        db.close()
