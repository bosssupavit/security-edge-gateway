# Security Edge Gateway

Edge gateway สำหรับรวมข้อมูลระบบรักษาความปลอดภัย (CCTV และ Access Control) แล้ว expose ออกไปยัง BAS/SCADA ผ่าน Modbus TCP

```
HikCentral (CCTV)  ──┐
                      ├── Security Edge Gateway ──► Modbus TCP (BAS/SCADA)
ZKBio Access (ZK)  ──┘         │
                                └── REST API (Frontend / Integration)
```

---

## สารบัญ

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้ง (Backend)](#การติดตั้ง-backend)
- [การติดตั้ง (Frontend)](#การติดตั้ง-frontend)
- [การตั้งค่า config.yaml](#การตั้งค่า-configyaml)
- [Modbus Register Map](#modbus-register-map)
- [REST API](#rest-api)
- [การ Migrate ฐานข้อมูล](#การ-migrate-ฐานข้อมูล)
- [Default Credentials](#default-credentials)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Security Edge Gateway                  │
│                                                         │
│  ┌──────────┐   ┌────────────┐   ┌────────────────────┐ │
│  │  Poller  │──►│  SQLite DB │──►│  Modbus TCP Server │ │
│  │ (thread) │   │ gateway.db │   │  port 5020         │ │
│  └────┬─────┘   └────────────┘   └────────────────────┘ │
│       │                                                  │
│  ┌────▼──────────────────────────┐                       │
│  │     FastAPI REST API :8080    │                       │
│  └───────────────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
       │                      │
  HikCentral API          ZKBio BioTime API
  (Artemis HMAC)          (JWT)
```

- **Poller** ทำงานเป็น background thread poll ข้อมูลจาก HikCentral และ ZKBio ทุก `poll_interval_sec` วินาที แล้วเขียนลง SQLite
- **Modbus Server** อ่านข้อมูลจาก SQLite แล้ว map ลง holding registers ตาม register layout
- **FastAPI** ให้ REST API สำหรับ frontend และ integration อื่น ๆ

---

## Tech Stack

### Backend
| Component | Version |
|-----------|---------|
| Python | 3.13 |
| FastAPI | 0.115.0 |
| SQLAlchemy | 2.0.35 |
| pymodbus | 3.7.4 |
| SQLite | built-in |
| uvicorn | 0.30.6 |

### Frontend
| Component | Version |
|-----------|---------|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 3 |

---

## โครงสร้างโปรเจกต์

```
security-edge-gateway/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py             # POST /api/auth/login
│   │   │   ├── device_management.py# CRUD cameras & ZK devices
│   │   │   ├── hikcentral.py       # HikCentral proxy endpoints
│   │   │   ├── routes.py           # cameras, ZK, modbus, health
│   │   │   └── users.py            # User management (admin only)
│   │   ├── services/
│   │   │   ├── hikcentral_client.py# HikCentral Artemis HMAC client
│   │   │   ├── modbus_server.py    # Modbus TCP server + register refresh
│   │   │   ├── poller.py           # Background polling loop
│   │   │   └── zk_client.py        # ZKBio BioTime REST client
│   │   ├── auth.py                 # JWT helper
│   │   ├── config.py               # Settings (pydantic)
│   │   ├── db.py                   # SQLAlchemy engine / session
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── models.py               # ORM models
│   │   ├── schemas.py              # Request/Response schemas
│   │   └── state.py                # Shared mutable state (STARTUP_TIME)
│   ├── config.yaml                 # Configuration file
│   ├── migrate.py                  # DB migration script
│   ├── requirements.txt
│   └── run.py                      # Entry point
└── frontend/
    ├── src/
    └── package.json
```

---

## การติดตั้ง (Backend)

```bash
cd backend

# สร้าง virtual environment
python3.13 -m venv venv
source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# ตั้งค่า config
cp config.yaml.example config.yaml   # แก้ไขตามสภาพแวดล้อม

# Migrate ฐานข้อมูล (ครั้งแรก หรือเมื่อ schema เปลี่ยน)
venv/bin/python migrate.py

# รัน server
venv/bin/python run.py
```

Server จะฟังที่ `http://0.0.0.0:8080`  
API Docs: `http://localhost:8080/docs`

---

## การติดตั้ง (Frontend)

```bash
cd frontend
npm install
npm run dev      # dev server ที่ localhost:5173
npm run build    # build สำหรับ production
```

---

## การตั้งค่า config.yaml

```yaml
app:
  host: 0.0.0.0
  port: 8080
  poll_interval_sec: 5    # ความถี่ polling (วินาที)
  modbus_host: 0.0.0.0
  modbus_port: 5020        # Modbus TCP port (502 สำหรับ production)

hikcentral:
  base_url: https://<hikcentral-host>
  app_key: "<app-key>"
  app_secret: "<app-secret>"

zkbio:
  base_url: https://<zkbio-host>
  username: admin
  password: P@ssw0rd
  page_size: 100

database:
  url: sqlite:///./gateway.db

bacnet:
  enabled: true
  ip: 192.168.1.50/24
  device_id: 4001

push:
  port: 8088
```

---

## Modbus Register Map

Unit ID: **1** | Function Code: **FC03 Holding Registers**

### Block A — ZK Access Control (40000–40007)

| Register | Address | Description |
|----------|---------|-------------|
| 40000 | 0 | Slot 0–4 |
| 40001 | 1 | Slot 5–9 |
| … | … | … |
| 40007 | 7 | Slot 35–39 |

**Layout per register:** 5 devices × 3 bits = 15 bits used

| Bit offset | Meaning |
|-----------|---------|
| `slot × 3 + 0` | Online/Offline (1=online) |
| `slot × 3 + 1` | Door Open (1=open) |
| `slot × 3 + 2` | Door Closed (1=closed) |

> `slot_no` และ `modbus_register` ตั้งค่าได้ผ่าน `PATCH /api/devices/zk/{id}`

### Block B — CCTV Cameras (40010–40020)

| Register | Address | Description |
|----------|---------|-------------|
| 40010 | 9 | Channel 0–15 |
| 40011 | 10 | Channel 16–31 |
| … | … | … |
| 40020 | 19 | Channel 160–175 |

**Layout per register:** 16 cameras × 1 bit  
Bit value: **0 = online**, 1 = offline (default = 0xFFFF = all offline)

> `channel_no` และ `modbus_register` ตั้งค่าได้ผ่าน `PATCH /api/devices/cameras/{id}`

---

## REST API

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```

Response:
```json
{ "access_token": "<jwt>", "token_type": "bearer", "role": "admin" }
```

ส่ง token ใน header: `Authorization: Bearer <token>`

---

### Health Check

```http
GET /api/health
```

```json
{
  "status": "ok",
  "gateway": { "ok": true, "host": "0.0.0.0", "port": 8080, "uptime_sec": 142.3 },
  "sqlite":  { "ok": true },
  "modbus":  { "ok": true, "host": "127.0.0.1", "port": 5020 },
  "hikcentral": { "ok": true, "base_url": "https://..." },
  "zkbio":   { "ok": true, "base_url": "https://..." }
}
```

---

### Cameras

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cameras` | — | รายการกล้องทั้งหมด + NVR info |
| GET | `/api/devices/cameras` | ✓ | รายการกล้อง (management view) |
| GET | `/api/devices/cameras/{id}` | ✓ | กล้องแต่ละตัว |
| PATCH | `/api/devices/cameras/{id}` | ✓ | แก้ไข camera_name / ip_address / channel_no / modbus_register |

---

### ZK Access Control Devices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/zk/devices` | — | รายการ ZK devices ทั้งหมด |
| GET | `/api/devices/zk` | ✓ | รายการ ZK devices (management view) |
| GET | `/api/devices/zk/{id}` | ✓ | ZK device แต่ละตัว |
| PATCH | `/api/devices/zk/{id}` | ✓ | แก้ไข alias / ip_address / slot_no / modbus_register |

---

### Modbus

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/modbus/registers` | — | อ่านค่า holding registers จาก datastore |
| GET | `/api/modbus/register-map` | — | DB mapping (modbus_register ที่ตั้งค่าแล้ว) |

---

### HikCentral

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hikcentral/encode-devices` | ✓ | NVR/DVR จาก HikCentral โดยตรง |
| GET | `/api/hikcentral/nvr` | ✓ | NVR จาก DB พร้อม camera count |
| GET | `/api/hikcentral/nvr/{index_code}` | ✓ | NVR เดี่ยว + รายการกล้อง |

---

### Users (Admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/` | admin | รายการ users |
| POST | `/api/users/` | admin | สร้าง user ใหม่ |
| PATCH | `/api/users/{id}` | admin | แก้ไข user |
| DELETE | `/api/users/{id}` | admin | ลบ user |

---

## การ Migrate ฐานข้อมูล

ใช้ `migrate.py` เพื่อ add columns ที่ขาดหายไป (idempotent — รันซ้ำได้ปลอดภัย):

```bash
# ต้อง stop app ก่อน (SQLite จะ lock ถ้า app กำลัง run อยู่)
venv/bin/python migrate.py
```

Script จะ:
- เพิ่ม columns ที่ขาดใน `camera_status` และ `zk_device_status`
- สร้างตาราง `nvr_status` ถ้ายังไม่มี
- DROP ตาราง legacy: `camera_master`, `door_master`, `door_status`, `access_event`, `zk_access_event`

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |

> **แนะนำ:** เปลี่ยน password หลัง deploy ผ่าน `PATCH /api/users/{id}`
