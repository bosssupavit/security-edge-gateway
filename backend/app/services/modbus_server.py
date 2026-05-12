"""
Modbus TCP Server
=================
Expose camera, door (ZK) and ZK device status to BAS/SCADA clients.

FC03  Holding Registers
-----------------------
Block A — ZK Access Control (per spec)
  Start address : 40000  (protocol addr = 0;  40001 = addr 0)
  Layout        : 5 devices per register, 3 bits per device
  Per device at slot s:
    protocol_addr  = ACC_HR_BASE + (s // 5)
    bit_offset     = (s % 5) * 3
    bit_offset + 0 : Status     (0=OFF/offline,  1=ON/online)
    bit_offset + 1 : Door Open  (0=Not Open,     1=Open)
    bit_offset + 2 : Door Closed(0=Not Closed,   1=Closed)
  Register range: 40000 - 40007  (8 registers, 40 device slots)

  slot_no in DoorMaster determines register position (0-based):
    slot 0  -> reg 40000 bits 0-2   (ACC01 / ACC41 / 192.168.244.41)
    slot 1  -> reg 40000 bits 3-5   (ACC02 / ACC42 / 192.168.244.42)
    slot 5  -> reg 40001 bits 0-2   (ACC06 / ACC46 / 192.168.244.46)
    slot 36 -> reg 40007 bits 3-5   (TA01  / ACC77 / 192.168.244.77)

Block B — CCTV cameras (per spec)
  Start address : 40010  (protocol addr = 9)
  Layout        : 16 cameras per register, 1 bit each
  Bit value     : 0 = online/active   1 = offline/fault
  Register range: 40010 - 40020  (11 registers, 176 camera slots)

  channel_no in CameraMaster determines position (0-based):
    protocol_addr = 9 + (channel_no // 16)
    bit_position  = channel_no % 16
"""

import threading
import logging

from pymodbus.datastore import (
    ModbusServerContext,
    ModbusSlaveContext,
    ModbusSequentialDataBlock,
)
from pymodbus.server import StartTcpServer

from app.config import settings
from app.db import SessionLocal
from app.models import CameraStatus, ZkDeviceStatus

logger = logging.getLogger(__name__)

# -- ZK ACC Holding Register constants (FC03 Block A) -------------------------
ACC_HR_BASE          = 0     # protocol address = 40000
ACC_DEVICES_PER_REG  = 5
ACC_BITS_PER_DEVICE  = 3
ACC_NUM_REGS         = 8     # covers slots 0-39 (40 devices)

# -- CCTV Holding Register constants (FC03 Block B) ---------------------------
CCTV_HR_BASE         = 9     # protocol address = 40010
CCTV_CAMERAS_PER_REG = 16
CCTV_NUM_REGS        = 11    # covers 40010 - 40020 (176 camera slots)

MODBUS_HOST = getattr(settings.app, 'modbus_host', '0.0.0.0')
MODBUS_PORT = getattr(settings.app, 'modbus_port', 502)
UNIT_ID = 1

# -- shared datastore ---------------------------------------------------------
_hr_block = ModbusSequentialDataBlock(0, [0] * 65536)
_ir_block = ModbusSequentialDataBlock(0, [0] * 65536)
_slave = ModbusSlaveContext(hr=_hr_block, ir=_ir_block)
# single=True: respond to ANY unit/slave ID (BAS clients often use 0xFF=255)
_context = ModbusServerContext(slaves=_slave, single=True)


# -- FC03 Block A: ZK Access Control ------------------------------------------

def _refresh_acc_hr(db):
    """Compute ZK access control bitmask from stored modbus_register + slot_no."""
    regs = [0] * ACC_NUM_REGS
    devices = db.query(ZkDeviceStatus).filter(
        ZkDeviceStatus.modbus_register.isnot(None),
        ZkDeviceStatus.slot_no.isnot(None),
    ).all()
    for d in devices:
        reg_index = d.modbus_register - 40000  # e.g. 40000->0, 40001->1
        bit_offset = d.slot_no * ACC_BITS_PER_DEVICE
        if reg_index < 0 or reg_index >= ACC_NUM_REGS:
            logger.warning('[modbus] ZK id=%d register=%d out of range', d.id, d.modbus_register)
            continue
        if d.online:
            regs[reg_index] |= (1 << (bit_offset + 0))
        if d.door_opened:
            regs[reg_index] |= (1 << (bit_offset + 1))
        if d.door_closed:
            regs[reg_index] |= (1 << (bit_offset + 2))

    _context[0].setValues(3, ACC_HR_BASE, regs)
    online_count = sum(1 for d in devices if d.online)
    logger.debug('[modbus] ACC HR: %d/%d online | regs 40000-40007 = %s',
                 online_count, len(devices), [hex(r) for r in regs])


# -- FC03 Block B: CCTV cameras -----------------------------------------------

def _refresh_cctv_hr(db):
    """Compute CCTV bitmask from stored modbus_register + channel_no."""
    regs = [0x0000] * CCTV_NUM_REGS  # default: all offline (bit=0)
    cameras = db.query(CameraStatus).filter(
        CameraStatus.modbus_register.isnot(None),
        CameraStatus.channel_no.isnot(None),
    ).all()
    for c in cameras:
        reg_index = c.modbus_register - 40010  # 40010->0, 40011->1, ...
        bit_pos = c.channel_no % CCTV_CAMERAS_PER_REG  # 0-15 within this register
        if reg_index < 0 or reg_index >= CCTV_NUM_REGS:
            logger.warning('[modbus] Camera id=%d register=%d out of range', c.id, c.modbus_register)
            continue
        if c.online:
            regs[reg_index] |= (1 << bit_pos)   # set bit = 1 -> online

    _context[0].setValues(3, CCTV_HR_BASE, regs)
    online_count = sum(1 for c in cameras if c.online)
    logger.debug('[modbus] CCTV HR: %d/%d online | regs 40010-40020 = %s',
                 online_count, len(cameras), [hex(r) for r in regs])


# -- main refresh -------------------------------------------------------------

def refresh_registers():
    """Pull latest status from DB and update all HR blocks.

    Each block is isolated so a failure in one does not prevent the others
    from updating (same crash-isolation pattern used in the poller).
    """
    db = SessionLocal()
    try:
        for label, fn in [
            ('acc_hr',  lambda: _refresh_acc_hr(db)),   # FC03 addr 0  (40000-40007)  ZK door status
            ('cctv_hr', lambda: _refresh_cctv_hr(db)),  # FC03 addr 9  (40010-40020)  CCTV status
        ]:
            try:
                fn()
            except Exception as exc:
                logger.error('[modbus] %s refresh error: %s', label, exc)
    finally:
        db.close()


def _refresh_loop(interval_sec=5):
    import time
    while True:
        refresh_registers()
        time.sleep(interval_sec)


_modbus_running = False


def is_modbus_running() -> bool:
    return _modbus_running


def start_modbus_server():
    """Start Modbus TCP server and a background refresh thread."""
    global _modbus_running
    refresh_registers()
    _modbus_running = True

    t = threading.Thread(
        target=_refresh_loop,
        kwargs={'interval_sec': settings.app.poll_interval_sec},
        daemon=True,
        name='modbus-refresh',
    )
    t.start()

    logger.info('[modbus] TCP server listening on %s:%s', MODBUS_HOST, MODBUS_PORT)

    StartTcpServer(
        context=_context,
        address=(MODBUS_HOST, MODBUS_PORT),
    )
