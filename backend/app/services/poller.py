import platform
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from app.config import settings
from app.db import SessionLocal
from app.models import CameraStatus, NvrStatus, ZkDeviceStatus, ZkAccessTransaction
from app.services.hikcentral_client import HikCentralClient
from app.services.zk_client import ZkBioClient


client = HikCentralClient(
    base_url=settings.hikcentral.base_url,
    app_key=settings.hikcentral.app_key,
    app_secret=settings.hikcentral.app_secret,
)

zk_client = ZkBioClient(
    base_url=settings.zkbio.base_url,
    access_token=settings.zkbio.access_token,
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

def _ping_host(ip: str) -> bool:
    """Return True if the host responds to a single ICMP ping."""
    if not ip:
        return False
    is_windows = platform.system().lower() == 'windows'
    count_param = '-n' if is_windows else '-c'
    timeout_param = '-w' if is_windows else '-W'
    timeout_val = '500' if is_windows else '1'
    try:
        result = subprocess.run(
            ['ping', count_param, '1', timeout_param, timeout_val, ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=2,
        )
        return result.returncode == 0
    except Exception:
        return False


def _sync_cameras_live_status(db):
    rows = db.query(CameraStatus).all()
    if not rows:
        return

    # Ping all cameras in parallel — 168 cameras fire simultaneously, ~1-2s total
    with ThreadPoolExecutor(max_workers=min(200, len(rows))) as executor:
        futures = {executor.submit(_ping_host, row.ip_address): row for row in rows}
        for future in as_completed(futures):
            row = futures[future]
            ping_online = future.result()
            row.status = 1 if ping_online else 0
            row.online = ping_online
            row.updated_at = datetime.utcnow()

    print(f'[poller] updated live status for {len(rows)} cameras (ping-based)')



def _sync_zk_devices(db):
    """
    §2.9.1  Poll CVSecurity for access control device list and upsert ZkDeviceStatus.
    """
    devices = zk_client.get_devices()

    for dev in devices:
        sn = dev.get('sn', '').strip()
        if not sn:
            continue

        row = db.query(ZkDeviceStatus).filter(ZkDeviceStatus.sn == sn).first()
        if not row:
            row = ZkDeviceStatus(sn=sn)
            db.add(row)

        row.zk_id       = dev.get('zk_id', '')
        row.name        = dev.get('name', '')
        row.device_type = dev.get('device_type', '')
        row.online      = dev.get('online', False)
        row.updated_at  = datetime.utcnow()

    print(f'[poller] synced {len(devices)} ZK devices')


def _sync_zk_door_states(db):
    """
    §2.11.1  Poll CVSecurity for door states and update matched ZkDeviceStatus rows.

    Match key: door.zk_device_id == ZkDeviceStatus.zk_id  (both are CVSecurity internal IDs).
    get_all_door_states() now returns parsed dicts (via _paginate + _parse_door_state).
    """
    states = zk_client.get_all_door_states()
    if not states:
        return

    rows = db.query(ZkDeviceStatus).all()
    zk_id_map: dict[str, ZkDeviceStatus] = {r.zk_id: r for r in rows if r.zk_id}

    updated = 0
    for state in states:
        matched_row = zk_id_map.get(state['zk_device_id'])
        if matched_row is None:
            continue

        matched_row.door_zk_id  = state['id']
        matched_row.door_name   = state['name'] or matched_row.door_name
        matched_row.door_opened = state['door_opened']
        matched_row.door_closed = state['door_closed']
        matched_row.unlocked    = state['unlocked']
        matched_row.online      = state['online']
        matched_row.alarm       = state['alarm']
        matched_row.updated_at  = datetime.utcnow()
        updated += 1

    print(f'[poller] updated door state for {updated} ZK devices')


def _sync_zk_transactions(db):
    """
    §2.18.2  Poll CVSecurity for latest access transactions and store new ones.
    Only inserts rows not yet in DB (deduplicates by event_id).
    """
    raw_list = zk_client.get_transactions()
    if not raw_list:
        return

    new_count = 0
    for raw in raw_list:
        event_id = raw.get('id', '')
        if not event_id:
            continue
        exists = db.query(ZkAccessTransaction).filter(
            ZkAccessTransaction.event_id == event_id
        ).first()
        if exists:
            continue

        db.add(ZkAccessTransaction(
            event_id    = event_id,
            event_time  = raw.get('eventTime', ''),
            pin         = raw.get('pin', ''),
            name        = raw.get('name', ''),
            card_no     = raw.get('cardNo', ''),
            dev_sn      = raw.get('devSn', ''),
            dev_name    = raw.get('devName', ''),
            event_name  = raw.get('eventName', ''),
            reader_name = raw.get('readerName', ''),
            area_name   = raw.get('areaName', ''),
        ))
        new_count += 1

    print(f'[poller] inserted {new_count} new ZK transactions')


def polling_loop():
    while True:
        db = SessionLocal()
        try:
            for label, fn in [
                ('nvr',            lambda: _sync_nvr(db)),
                ('cameras',        lambda: _sync_cameras_live_status(db)),
                ('zk_devices',     lambda: _sync_zk_devices(db)),
                ('zk_door_states', lambda: _sync_zk_door_states(db)),
                # ('zk_transactions', lambda: _sync_zk_transactions(db)),
            ]:
                try:
                    fn()
                except Exception as e:
                    print(f'[poller] {label} error: {e}')
            db.commit()
        except Exception as e:
            print('[poller] commit error:', e)
        finally:
            db.close()

        time.sleep(settings.app.poll_interval_sec)


def start_polling():
    thread = threading.Thread(target=polling_loop, daemon=True)
    thread.start()
