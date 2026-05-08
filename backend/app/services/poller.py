import threading
import time
from datetime import datetime

from app.config import settings
from app.db import SessionLocal
from app.models import CameraStatus, NvrStatus, ZkDeviceStatus, ZkAccessTransaction
from app.services.hikcentral_client import HikCentralClient
from app.services.zk_client import ZkBioClient, _parse_door_state


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

        row.name       = dev.get('name', '')
        row.online     = dev.get('online', False)
        row.updated_at = datetime.utcnow()

    print(f'[poller] synced {len(devices)} ZK devices')


def _sync_zk_door_states(db):
    """
    §2.11.1  Poll CVSecurity for door states and update door_opened/door_closed
    on the matching ZkDeviceStatus row (matched by IP prefix of door name).
    """
    raw_states = zk_client.get_all_door_states()
    if not raw_states:
        return

    # Build ip_address -> ZkDeviceStatus lookup
    rows = db.query(ZkDeviceStatus).all()
    ip_map: dict[str, ZkDeviceStatus] = {r.ip_address: r for r in rows if r.ip_address}

    updated = 0
    for raw in raw_states:
        state = _parse_door_state(raw)
        door_name = state.get('name', '')

        # Door name from CVSecurity is typically "<ip>-<door_no>" e.g. "192.168.1.1-1"
        ip_part = door_name.rsplit('-', 1)[0]
        matched_row = ip_map.get(ip_part)
        if matched_row is None:
            continue

        matched_row.door_opened = state['door_opened']
        matched_row.door_closed = state['door_closed']
        matched_row.online      = state['online']
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
            _sync_nvr(db)
            _sync_cameras(db)
            _sync_zk_devices(db)
            _sync_zk_door_states(db)
            _sync_zk_transactions(db)
            db.commit()
        except Exception as e:
            print('[poller]', e)
        finally:
            db.close()

        time.sleep(settings.app.poll_interval_sec)


def start_polling():
    thread = threading.Thread(target=polling_loop, daemon=True)
    thread.start()
