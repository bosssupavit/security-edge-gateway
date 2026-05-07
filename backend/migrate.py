"""
DB Migration — Redesign camera_status table
============================================
Adds new columns from HikCentral API response.
Old columns (latency_ms, recording) are left in place and ignored.

Run once:
    python migrate.py
"""
import sqlite3
import sys

DB_PATH = 'gateway.db'

CAMERA_NEW_COLS = [
    ('status',               'INTEGER DEFAULT 0'),
    ('ip_address',           'TEXT DEFAULT ""'),
    ('capability_set',       'TEXT DEFAULT ""'),
    ('encode_dev_index_code','TEXT DEFAULT ""'),
    ('record_type',          'TEXT DEFAULT ""'),
    ('record_location',      'TEXT DEFAULT ""'),
    ('region_index_code',    'TEXT DEFAULT ""'),
    ('site_index_code',      'TEXT DEFAULT ""'),
]

NVR_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS nvr_status (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    index_code          TEXT    UNIQUE NOT NULL,
    name                TEXT    DEFAULT '',
    ip_address          TEXT    DEFAULT '',
    port                TEXT    DEFAULT '8000',
    device_code         TEXT    DEFAULT '',
    treaty_type         TEXT    DEFAULT '',
    status              INTEGER DEFAULT 0,
    online              INTEGER DEFAULT 0,
    updated_at          DATETIME
)
"""

ZK_DEVICE_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS zk_device_status (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    sn                  TEXT    UNIQUE NOT NULL,
    alias               TEXT    DEFAULT '',
    area                TEXT    DEFAULT '',
    ip_address          TEXT    DEFAULT '',
    terminal_name       TEXT    DEFAULT '',
    fw_ver              TEXT    DEFAULT '',
    terminal_state      INTEGER DEFAULT 0,
    online              INTEGER DEFAULT 0,
    last_activity       TEXT    DEFAULT '',
    user_count          INTEGER DEFAULT 0,
    transaction_count   INTEGER DEFAULT 0,
    updated_at          DATETIME
)
"""


def add_column(cur: sqlite3.Cursor, table: str, col_name: str, col_def: str):
    try:
        cur.execute(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_def}')
        print(f'  + {table}.{col_name}')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print(f'  ~ {table}.{col_name} (already exists, skipped)')
        else:
            raise


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print(f'Migrating {DB_PATH} ...')
    print('camera_status — adding HikCentral API fields:')
    for col_name, col_def in CAMERA_NEW_COLS:
        add_column(cur, 'camera_status', col_name, col_def)

    print('nvr_status — creating table if not exists:')
    cur.execute(NVR_CREATE_SQL)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_nvr_status_index_code ON nvr_status (index_code)")
    print('  + nvr_status (ok)')

    print('zk_device_status — creating table if not exists:')
    cur.execute(ZK_DEVICE_CREATE_SQL)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_zk_device_status_sn ON zk_device_status (sn)")
    print('  + zk_device_status (ok)')

    print('camera_master — creating table if not exists:')
    cur.execute("""
        CREATE TABLE IF NOT EXISTS camera_master (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    DEFAULT '',
            ip_address  TEXT    DEFAULT '',
            channel_no  INTEGER UNIQUE NOT NULL,
            enabled     INTEGER DEFAULT 1,
            created_at  DATETIME
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_camera_master_channel_no ON camera_master (channel_no)")
    print('  + camera_master (ok)')

    print('door_master — creating table if not exists:')
    cur.execute("""
        CREATE TABLE IF NOT EXISTS door_master (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT    DEFAULT '',
            controller_sn   TEXT    DEFAULT '',
            door_no         INTEGER DEFAULT 1,
            slot_no         INTEGER DEFAULT 0,
            enabled         INTEGER DEFAULT 1,
            created_at      DATETIME
        )
    """)
    add_column(cur, 'door_master', 'slot_no', 'INTEGER DEFAULT 0')
    print('  + door_master (ok)')

    print('zk_device_status — adding BioTime API fields:')
    for col, defn in [
        ('alias',             'TEXT DEFAULT ""'),
        ('area',              'TEXT DEFAULT ""'),
        ('terminal_name',     'TEXT DEFAULT ""'),
        ('fw_ver',            'TEXT DEFAULT ""'),
        ('terminal_state',    'INTEGER DEFAULT 0'),
        ('last_activity',     'TEXT DEFAULT ""'),
        ('user_count',        'INTEGER DEFAULT 0'),
        ('transaction_count', 'INTEGER DEFAULT 0'),
    ]:
        add_column(cur, 'zk_device_status', col, defn)

    print('zk_device_status — adding door state columns:')
    add_column(cur, 'zk_device_status', 'door_opened', 'INTEGER DEFAULT 0')
    add_column(cur, 'zk_device_status', 'door_closed',  'INTEGER DEFAULT 1')

    print('camera_status — adding channel_no (modbus mapping):')  
    add_column(cur, 'camera_status', 'channel_no', 'INTEGER DEFAULT NULL')
    add_column(cur, 'camera_status', 'modbus_register', 'INTEGER DEFAULT NULL')

    print('zk_device_status — adding slot_no (modbus mapping):')
    add_column(cur, 'zk_device_status', 'slot_no', 'INTEGER DEFAULT NULL')
    add_column(cur, 'zk_device_status', 'modbus_register', 'INTEGER DEFAULT NULL')

    print('drop legacy tables (no longer used):')
    for tbl in ['camera_master', 'door_master', 'door_status', 'access_event', 'zk_access_event']:
        cur.execute(f'DROP TABLE IF EXISTS {tbl}')
        print(f'  - {tbl} dropped')

    conn.commit()
    conn.close()
    print('Done.')


if __name__ == '__main__':
    main()
