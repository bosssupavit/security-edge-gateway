from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import CameraStatus, NvrStatus, ZkDeviceStatus, ZkAccessTransaction
import socket
import time

from app.config import settings
from app import state as _app_state
from app.services.modbus_server import (
    ACC_HR_BASE, ACC_DEVICES_PER_REG, ACC_BITS_PER_DEVICE, ACC_NUM_REGS,
    CCTV_HR_BASE, CCTV_CAMERAS_PER_REG, CCTV_NUM_REGS,
    UNIT_ID, _context, is_modbus_running,
    MODBUS_HOST, MODBUS_PORT,
)

router = APIRouter()


@router.get('/api/health')
def healthcheck():
    """Check liveness of all subsystems."""
    results = {}
    overall = True

    # --- Self / Gateway service -----------------------------------------------
    uptime_sec = time.time() - (_app_state.STARTUP_TIME or time.time())
    results['gateway'] = {
        'ok': True,
        'host': settings.app.host,
        'port': settings.app.port,
        'uptime_sec': round(uptime_sec, 1),
    }

    # --- SQLite ---------------------------------------------------------------
    try:
        db = SessionLocal()
        db.execute(__import__('sqlalchemy').text('SELECT 1'))
        db.close()
        results['sqlite'] = {'ok': True}
    except Exception as e:
        results['sqlite'] = {'ok': False, 'error': str(e)}
        overall = False

    # --- Modbus server --------------------------------------------------------
    modbus_up = is_modbus_running()
    # Also try TCP connect to confirm socket is open
    try:
        host = MODBUS_HOST if MODBUS_HOST != '0.0.0.0' else '127.0.0.1'
        s = socket.create_connection((host, MODBUS_PORT), timeout=1)
        s.close()
        results['modbus'] = {'ok': True, 'host': host, 'port': MODBUS_PORT}
    except Exception as e:
        results['modbus'] = {'ok': False, 'error': str(e), 'initialized': modbus_up}
        overall = False

    # --- HikCentral -----------------------------------------------------------
    try:
        from app.services.hikcentral_client import HikCentralClient
        client = HikCentralClient(
            base_url=settings.hikcentral.base_url,
            app_key=settings.hikcentral.app_key,
            app_secret=settings.hikcentral.app_secret,
        )
        resp = client.get_cameras(page_size=1)
        results['hikcentral'] = {'ok': True, 'base_url': settings.hikcentral.base_url}
    except Exception as e:
        results['hikcentral'] = {'ok': False, 'error': str(e), 'base_url': settings.hikcentral.base_url}
        overall = False

    # --- ZK CVSecurity -------------------------------------------------------
    # Verify connectivity by calling a lightweight list endpoint with access_token
    try:
        import requests as _req
        r = _req.get(
            f"{settings.zkbio.base_url.rstrip('/')}/api/device/accList",
            params={'access_token': settings.zkbio.access_token, 'pageNo': 1, 'pageSize': 1},
            timeout=5,
        )
        body = r.json()
        if r.ok and body.get('code', -1) == 0:
            results['zkbio'] = {'ok': True, 'base_url': settings.zkbio.base_url}
        else:
            results['zkbio'] = {'ok': False, 'error': f"code={body.get('code')} {body.get('message', '')}",
                                'base_url': settings.zkbio.base_url}
            overall = False
    except Exception as e:
        results['zkbio'] = {'ok': False, 'error': str(e), 'base_url': settings.zkbio.base_url}
        overall = False

    return {'status': 'ok' if overall else 'degraded', **results}


@router.get('/api/cameras')
def get_cameras():
    """List all cameras from local DB with full fields, joined with NVR info."""
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(CameraStatus, NvrStatus)
            .outerjoin(NvrStatus, CameraStatus.encode_dev_index_code == NvrStatus.index_code)
            .order_by(CameraStatus.id)
            .all()
        )
        return [
            {
                'id': c.id,
                'index_code': c.index_code,
                'camera_name': c.camera_name,
                'ip_address': c.ip_address,
                'status': c.status,
                'online': c.online,
                'capability_set': c.capability_set,
                'record_type': c.record_type,
                'record_location': c.record_location,
                'region_index_code': c.region_index_code,
                'site_index_code': c.site_index_code,
                'channel_no': c.channel_no,
                'modbus_register': c.modbus_register,
                'updated_at': c.updated_at,
                'nvr': {
                    'index_code': nvr.index_code,
                    'name': nvr.name,
                    'ip_address': nvr.ip_address,
                    'online': nvr.online,
                } if nvr else None,
            }
            for c, nvr in rows
        ]
    finally:
        db.close()


@router.get('/api/zk/devices')
def get_zk_devices():
    """List all ZK access controllers with live status polled from CVSecurity."""
    db: Session = SessionLocal()
    try:
        items = db.query(ZkDeviceStatus).order_by(ZkDeviceStatus.id).all()
        return [
            {
                'sn': d.sn,
                'name': d.name,
                'ip_address': d.ip_address,
                'online': d.online,
                'door_opened': d.door_opened,
                'door_closed': d.door_closed,
                'slot_no': d.slot_no,
                'modbus_register': d.modbus_register,
                'updated_at': d.updated_at,
            }
            for d in items
        ]
    finally:
        db.close()


@router.get('/api/zk/transactions')
def get_zk_transactions(
    limit: int = 100,
    offset: int = 0,
    dev_sn: str | None = None,
):
    """List ZK access transaction history (newest first)."""
    db: Session = SessionLocal()
    try:
        q = db.query(ZkAccessTransaction)
        if dev_sn:
            q = q.filter(ZkAccessTransaction.dev_sn == dev_sn)
        total = q.count()
        items = q.order_by(ZkAccessTransaction.id.desc()).offset(offset).limit(limit).all()
        return {
            'total': total,
            'offset': offset,
            'limit': limit,
            'transactions': [
                {
                    'id': t.id,
                    'event_id': t.event_id,
                    'event_time': t.event_time,
                    'pin': t.pin,
                    'name': t.name,
                    'card_no': t.card_no,
                    'dev_sn': t.dev_sn,
                    'dev_name': t.dev_name,
                    'event_name': t.event_name,
                    'reader_name': t.reader_name,
                    'area_name': t.area_name,
                    'created_at': t.created_at,
                }
                for t in items
            ],
        }
    finally:
        db.close()


@router.get('/api/modbus/registers')
def get_modbus_registers():
    """Read live Modbus holding register values from in-memory datastore."""
    slave = _context[UNIT_ID]

    # Block A: ZK ACC (40000-40007)
    acc_regs = slave.getValues(3, ACC_HR_BASE, ACC_NUM_REGS)
    acc_block = []
    for i, val in enumerate(acc_regs):
        register = 40000 + i
        devices = []
        for slot in range(ACC_DEVICES_PER_REG):
            bit_offset = slot * ACC_BITS_PER_DEVICE
            devices.append({
                'slot_no': slot,
                'status':      bool(val & (1 << (bit_offset + 0))),
                'door_open':   bool(val & (1 << (bit_offset + 1))),
                'door_closed': bool(val & (1 << (bit_offset + 2))),
            })
        acc_block.append({
            'register': register,
            'raw_hex': hex(val),
            'raw_dec': val,
            'devices': devices,
        })

    # Block B: CCTV (40010-40020)
    cctv_regs = slave.getValues(3, CCTV_HR_BASE, CCTV_NUM_REGS)
    cctv_block = []
    for i, val in enumerate(cctv_regs):
        register = 40010 + i
        cameras = []
        for bit in range(CCTV_CAMERAS_PER_REG):
            cameras.append({
                'channel_no': bit,
                'online': not bool(val & (1 << bit)),  # 0=online, 1=offline
            })
        cctv_block.append({
            'register': register,
            'raw_hex': hex(val),
            'raw_dec': val,
            'cameras': cameras,
        })

    return {
        'unit_id': UNIT_ID,
        'function_code': 3,
        'zk_access_control': acc_block,
        'cctv_cameras': cctv_block,
    }


@router.get('/api/modbus/register-map')
def get_register_map():
    """Return current Modbus register map (FC03 HR) for SCADA clients."""
    db: Session = SessionLocal()
    try:
        cameras = db.query(CameraStatus).filter(
            CameraStatus.modbus_register.isnot(None),
            CameraStatus.channel_no.isnot(None),
        ).order_by(CameraStatus.modbus_register, CameraStatus.channel_no).all()

        zk_devices = db.query(ZkDeviceStatus).filter(
            ZkDeviceStatus.modbus_register.isnot(None),
            ZkDeviceStatus.slot_no.isnot(None),
        ).order_by(ZkDeviceStatus.modbus_register, ZkDeviceStatus.slot_no).all()

        return {
            'unit_id': 1,
            'function_code': 3,
            'zk_access_control': {
                'description': 'FC03 HR 40000-40007 | 5 devices/reg, 3 bits/device (Status, DoorOpen, DoorClosed)',
                'reg_start': 40000,
                'reg_end': 40000 + ACC_NUM_REGS - 1,
                'devices': [
                    {
                        'id': d.id,
                        'sn': d.sn,
                        'name': d.name,
                        'ip_address': d.ip_address,
                        'modbus_register': d.modbus_register,
                        'slot_no': d.slot_no,
                        'bit_status':      d.slot_no * ACC_BITS_PER_DEVICE + 0,
                        'bit_door_open':   d.slot_no * ACC_BITS_PER_DEVICE + 1,
                        'bit_door_closed': d.slot_no * ACC_BITS_PER_DEVICE + 2,
                    }
                    for d in zk_devices
                ],
            },
            'cctv_cameras': {
                'description': 'FC03 HR 40010-40020 | 16 cameras/reg, bit=0 online bit=1 offline',
                'reg_start': 40010,
                'reg_end': 40010 + CCTV_NUM_REGS - 1,
                'cameras': [
                    {
                        'id': c.id,
                        'camera_name': c.camera_name,
                        'ip_address': c.ip_address,
                        'modbus_register': c.modbus_register,
                        'channel_no': c.channel_no,
                    }
                    for c in cameras
                ],
            },
        }
    finally:
        db.close()

