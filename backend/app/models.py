from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.db import Base


class CameraStatus(Base):
    __tablename__ = 'camera_status'

    id = Column(Integer, primary_key=True)
    # ── identity ──────────────────────────────────────────────────────────────
    index_code = Column(String, unique=True, index=True)    # cameraIndexCode
    camera_name = Column(String)
    ip_address = Column(String, default='')                 # devIp from HikCentral
    # ── live status ───────────────────────────────────────────────────────────
    status = Column(Integer, default=0)                     # raw: 1=online, 2=offline
    online = Column(Boolean, default=False)                 # derived: status == 1
    # ── modbus mapping (user-configured) ─────────────────────────────────────
    channel_no      = Column(Integer, default=None, index=True)  # bit 0-15 within the register
    modbus_register = Column(Integer, default=None)              # actual register e.g. 40010
    # ── device info ───────────────────────────────────────────────────────────
    capability_set = Column(String, default='')             # e.g. "ptz,event_pdc"
    encode_dev_index_code = Column(String, default='')      # parent NVR/DVR index code
    record_type = Column(String, default='')                # "0"=normal, ""=none
    record_location = Column(String, default='')            # "1"=NVR, "0"=SD, ""=none
    region_index_code = Column(String, default='')
    site_index_code = Column(String, default='')
    updated_at = Column(DateTime, default=datetime.utcnow)


class NvrStatus(Base):
    __tablename__ = 'nvr_status'

    id = Column(Integer, primary_key=True)
    # ── identity ──────────────────────────────────────────────────────────────
    index_code = Column(String, unique=True, index=True)    # encodeDevIndexCode
    name = Column(String, default='')                       # encodeDevName
    ip_address = Column(String, default='')                 # encodeDevIp
    port = Column(String, default='8000')                   # encodeDevPort
    device_code = Column(String, default='')                # encodeDevCode (serial)
    treaty_type = Column(String, default='')                # e.g. "hiksdk_net"
    # ── live status ───────────────────────────────────────────────────────────
    status = Column(Integer, default=0)                     # 1=online, 0=offline
    online = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ZkDeviceStatus(Base):
    """ZKTeco access controller status polled from BioTime/ZKBio management system."""
    __tablename__ = 'zk_device_status'

    id = Column(Integer, primary_key=True)
    # ── identity (from BioTime API) ────────────────────────────────────────────
    sn = Column(String, unique=True, index=True)        # serial number
    alias = Column(String, default='')                  # device alias/name
    area = Column(String, default='')                   # location description
    ip_address = Column(String, default='')
    terminal_name = Column(String, default='')          # model e.g. SpeedFace-V3L
    fw_ver = Column(String, default='')                 # firmware version
    # ── live status ───────────────────────────────────────────────────────────
    terminal_state = Column(Integer, default=0)         # 1=online, 2=disabled, 3=offline
    online = Column(Boolean, default=False)             # derived: terminal_state == 1
    last_activity = Column(String, default='')          # last seen timestamp string
    # ── modbus mapping (user-configured) ──────────────────────────────────────
    slot_no         = Column(Integer, default=None, index=True) # device slot 0-4 within the register
    modbus_register = Column(Integer, default=None)             # actual register e.g. 40000
    # ── door state (polled / event-driven) ────────────────────────────────────
    door_opened = Column(Boolean, default=False)        # Modbus bit+1: Door Open
    door_closed = Column(Boolean, default=True)         # Modbus bit+2: Door Closed
    # ── statistics ────────────────────────────────────────────────────────────
    user_count = Column(Integer, default=0)
    transaction_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default='operator')
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


