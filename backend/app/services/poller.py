import threading
import time
from datetime import datetime

from app.config import settings
from app.db import SessionLocal
from app.models import CameraStatus, NvrStatus, ZkDeviceStatus
from app.services.hikcentral_client import HikCentralClient
from app.services.zk_client import ZkBioClient


client = HikCentralClient(
    base_url=settings.hikcentral.base_url,
    app_key=settings.hikcentral.app_key,
    app_secret=settings.hikcentral.app_secret,
)

zk_client = ZkBioClient(
    base_url=settings.zkbio.base_url,
    username=settings.zkbio.username,
    password=settings.zkbio.password,
    page_size=settings.zkbio.page_size,
)


def _sync_nvr(db):
    devices = client.get_encode_devices()
    for dev in devices:
        index_code = dev.get('encodeDevIndexCode', '')
        status_val = int(dev.get('status', 0))

        nvr = db.query(NvrStatus).filter(
            NvrStatus.index_code == index_code
        ).first()

        if not nvr:
            nvr = NvrStatus(index_code=index_code)
            db.add(nvr)

        nvr.name = dev.get('encodeDevName', '')
        nvr.ip_address = dev.get('encodeDevIp', '')
        nvr.port = dev.get('encodeDevPort', '8000')
        nvr.device_code = dev.get('encodeDevCode', '')
        nvr.treaty_type = dev.get('treatyType', '')
        nvr.status = status_val
        nvr.online = status_val == 1
        nvr.updated_at = datetime.utcnow()

    print(f'[poller] synced {len(devices)} NVRs')


def _sync_cameras(db):
    cameras = client.get_cameras()
    for cam_data in cameras:
        index_code = cam_data.get('cameraIndexCode', '')
        status_val = int(cam_data.get('status', 0))
        online = status_val == 1

        cam = db.query(CameraStatus).filter(
            CameraStatus.index_code == index_code
        ).first()

        if not cam:
            cam = CameraStatus(index_code=index_code)
            db.add(cam)

        cam.camera_name = cam_data.get('cameraName', 'Unknown')
        cam.status = status_val
        cam.online = online
        cam.capability_set = cam_data.get('capabilitySet', '')
        cam.encode_dev_index_code = cam_data.get('encodeDevIndexCode', '')
        cam.record_type = cam_data.get('recordType', '')
        cam.record_location = cam_data.get('recordLocation', '')
        cam.region_index_code = cam_data.get('regionIndexCode', '')
        cam.site_index_code = cam_data.get('siteIndexCode', '')
        cam.updated_at = datetime.utcnow()

    print(f'[poller] synced {len(cameras)} cameras')



def _sync_zk_devices(db):
    """Poll BioTime management system and upsert ZkDeviceStatus rows."""
    devices = zk_client.get_terminals()

    for dev in devices:
        sn = dev.get('sn', '').strip()
        if not sn:
            continue

        row = db.query(ZkDeviceStatus).filter(ZkDeviceStatus.sn == sn).first()
        if not row:
            row = ZkDeviceStatus(sn=sn)
            db.add(row)

        row.alias             = dev.get('alias', '')
        row.area              = dev.get('area', '')
        row.ip_address        = dev.get('ip_address', '')
        row.terminal_name     = dev.get('terminal_name', '')
        row.fw_ver            = dev.get('fw_ver', '')
        row.terminal_state    = dev.get('terminal_state', 0)
        row.online            = dev.get('online', False)
        row.last_activity     = dev.get('last_activity', '')
        row.user_count        = dev.get('user_count', 0)
        row.transaction_count = dev.get('transaction_count', 0)
        row.updated_at        = datetime.utcnow()

    print(f'[poller] synced {len(devices)} ZK devices')


def polling_loop():
    while True:
        db = SessionLocal()
        try:
            _sync_nvr(db)
            _sync_cameras(db)
            _sync_zk_devices(db)
            db.commit()
        except Exception as e:
            print('[poller]', e)
        finally:
            db.close()

        time.sleep(settings.app.poll_interval_sec)


def start_polling():
    thread = threading.Thread(target=polling_loop, daemon=True)
    thread.start()
