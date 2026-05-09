from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import SessionLocal
from app.models import CameraStatus, ZkDeviceStatus
from app.schemas import UpdateCameraStatusRequest, UpdateZkDeviceRequest

router = APIRouter(prefix='/api/devices', tags=['device-management'])


# =========================
# Camera Status Management
# =========================

@router.get('/cameras')
def get_camera_list(
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        items = db.query(CameraStatus).order_by(CameraStatus.id).all()
        return [
            {
                'id': x.id,
                'index_code': x.index_code,
                'camera_name': x.camera_name,
                'ip_address': x.ip_address,
                'modbus_register': x.modbus_register,
                'channel_no': x.channel_no,
                'online': x.online,
                'updated_at': x.updated_at,
            }
            for x in items
        ]
    finally:
        db.close()


@router.get('/cameras/{camera_id}')
def get_camera(
    camera_id: int,
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        item = db.query(CameraStatus).filter(CameraStatus.id == camera_id).first()
        if not item:
            raise HTTPException(404, 'Camera not found')
        return {
            'id': item.id,
            'index_code': item.index_code,
            'camera_name': item.camera_name,
            'ip_address': item.ip_address,
            'status': item.status,
            'online': item.online,
            'capability_set': item.capability_set,
            'record_type': item.record_type,
            'record_location': item.record_location,
            'region_index_code': item.region_index_code,
            'site_index_code': item.site_index_code,
            'channel_no': item.channel_no,
            'modbus_register': item.modbus_register,
            'updated_at': item.updated_at,
        }
    finally:
        db.close()


@router.patch('/cameras/{camera_id}')
def update_camera(
    camera_id: int,
    payload: UpdateCameraStatusRequest,
    current_user=Depends(get_current_user),
):
    """Update camera_name, ip_address, and/or channel_no (Modbus register bit)."""
    db: Session = SessionLocal()
    try:
        item = db.query(CameraStatus).filter(CameraStatus.id == camera_id).first()
        if not item:
            raise HTTPException(404, 'Camera not found')
        if payload.camera_name is not None:
            item.camera_name = payload.camera_name
        if payload.ip_address is not None:
            item.ip_address = payload.ip_address
        if payload.channel_no is not None:
            item.channel_no = payload.channel_no
        if payload.modbus_register is not None:
            item.modbus_register = payload.modbus_register
        db.commit()
        return {
            'status': 'updated',
            'id': camera_id,
            'camera_name': item.camera_name,
            'ip_address': item.ip_address,
            'modbus_register': item.modbus_register,
            'channel_no': item.channel_no,
        }
    finally:
        db.close()


# =========================
# ZK Device Management
# =========================

@router.get('/zk')
def get_zk_list(
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        items = db.query(ZkDeviceStatus).order_by(ZkDeviceStatus.id).all()
        return [
            {
                'id': x.id,
                'sn': x.sn,
                'name': x.name,
                'ip_address': x.ip_address,
                'modbus_register': x.modbus_register,
                'slot_no': x.slot_no,
                'online': x.online,
                'door_opened': x.door_opened,
                'door_closed': x.door_closed,
                'updated_at': x.updated_at,
            }
            for x in items
        ]
    finally:
        db.close()


@router.get('/zk/{device_id}')
def get_zk_device(
    device_id: int,
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        item = db.query(ZkDeviceStatus).filter(ZkDeviceStatus.id == device_id).first()
        if not item:
            raise HTTPException(404, 'ZK device not found')
        return {
            'id': item.id,
            'sn': item.sn,
            'name': item.name,
            'ip_address': item.ip_address,
            'online': item.online,
            'door_opened': item.door_opened,
            'door_closed': item.door_closed,
            'slot_no': item.slot_no,
            'modbus_register': item.modbus_register,
            'updated_at': item.updated_at,
        }
    finally:
        db.close()


@router.patch('/zk/{device_id}')
def update_zk_device(
    device_id: int,
    payload: UpdateZkDeviceRequest,
    current_user=Depends(get_current_user),
):
    """Update ip_address and/or slot_no / modbus_register (Modbus mapping) of a ZK device."""
    db: Session = SessionLocal()
    try:
        item = db.query(ZkDeviceStatus).filter(ZkDeviceStatus.id == device_id).first()
        if not item:
            raise HTTPException(404, 'ZK device not found')
        if payload.ip_address is not None:
            item.ip_address = payload.ip_address
        if payload.slot_no is not None:
            item.slot_no = payload.slot_no
        if payload.modbus_register is not None:
            item.modbus_register = payload.modbus_register
        db.commit()
        return {
            'status': 'updated',
            'id': device_id,
            'name': item.name,
            'ip_address': item.ip_address,
            'modbus_register': item.modbus_register,
            'slot_no': item.slot_no,
        }
    finally:
        db.close()
