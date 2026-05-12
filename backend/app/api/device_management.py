from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import SessionLocal
from app.models import CameraStatus, ZkDeviceStatus
from app.schemas import CreateCameraRequest, UpdateCameraStatusRequest, UpdateZkDeviceRequest

router = APIRouter(prefix='/api/devices', tags=['device-management'])


# =========================
# Camera Status Management
# =========================

@router.post('/cameras', status_code=201)
def create_camera(
    payload: CreateCameraRequest,
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        index_code = str(payload.index_code)
        # index_code ถูก generate อัตโนมัติ จึงไม่ควร duplicate แต่ตรวจไว้เผื่อกรณี client ส่งมาเอง
        existing = db.query(CameraStatus).filter(CameraStatus.index_code == index_code).first()
        if existing:
            raise HTTPException(409, 'Camera with this index_code already exists')
        camera = CameraStatus(
            index_code=index_code,
            camera_name=payload.camera_name,
            ip_address=payload.ip_address,
            channel_no=payload.channel_no,
            modbus_register=payload.modbus_register,
        )
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return {
            'id': camera.id,
            'index_code': camera.index_code,
            'camera_name': camera.camera_name,
            'ip_address': camera.ip_address,
            'modbus_register': camera.modbus_register,
            'channel_no': camera.channel_no,
            'online': camera.online,
            'updated_at': camera.updated_at,
        }
    finally:
        db.close()


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


@router.delete('/cameras/{camera_id}', status_code=204)
def delete_camera(
    camera_id: int,
    current_user=Depends(get_current_user),
):
    db: Session = SessionLocal()
    try:
        item = db.query(CameraStatus).filter(CameraStatus.id == camera_id).first()
        if not item:
            raise HTTPException(404, 'Camera not found')
        db.delete(item)
        db.commit()
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
                'device_type': x.device_type,
                'door_name': x.door_name,
                'door_zk_id': x.door_zk_id,
                'ip_address': x.ip_address,
                'modbus_register': x.modbus_register,
                'slot_no': x.slot_no,
                'online': x.online,
                'alarm': x.alarm,
                'door_opened': x.door_opened,
                'door_closed': x.door_closed,
                'unlocked': x.unlocked,
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
            'device_type': item.device_type,
            'door_name': item.door_name,
            'door_zk_id': item.door_zk_id,
            'ip_address': item.ip_address,
            'online': item.online,
            'alarm': item.alarm,
            'door_opened': item.door_opened,
            'door_closed': item.door_closed,
            'unlocked': item.unlocked,
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
