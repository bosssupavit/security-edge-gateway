# Security Edge Gateway — Backend

Edge gateway service that integrates **HikCentral** (CCTV / NVR) and **ZKBio** (access-control) systems, exposes device status over **Modbus TCP**, and provides a REST API for device management and monitoring.

## Architecture

```
HikCentral (ISAPI)          ZKBio / BioTime (REST)
       │                              │
       └──────────┬───────────────────┘
                  │  Poller (background thread, configurable interval)
                  ▼
           State / SQLite DB
                  │
       ┌──────────┴──────────┐
  Modbus TCP Server       FastAPI REST API
  (BAS/SCADA clients)     (management UI / BMS)
```

### Services

| Service | Description |
|---------|-------------|
| **FastAPI** | REST API on `app.port` (default `8099`) |
| **Poller** | Background thread that polls HikCentral and ZKBio on every `poll_interval_sec` |
| **Modbus TCP Server** | Exposes camera & access-controller status as holding registers on `modbus_port` (default `5020`) |

## Requirements

- Python 3.10+
- Dependencies listed in `requirements.txt`

Key packages: `fastapi`, `uvicorn`, `sqlalchemy`, `pymodbus`, `httpx`, `bac0`, `python-jose`, `passlib`

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Edit configuration
cp config.yaml config.local.yaml   # then fill in credentials

# 3. Run
python run.py
```

- REST API: `http://localhost:8099`
- Swagger docs: `http://localhost:8099/docs`
- Modbus TCP: `localhost:5020`

## Configuration (`config.yaml`)

```yaml
app:
  host: 0.0.0.0
  port: 8099
  poll_interval_sec: 5      # polling frequency (seconds)
  modbus_host: 0.0.0.0
  modbus_port: 5020

hikcentral:
  base_url: https://<hikcentral-host>
  app_key: "<app-key>"
  app_secret: "<app-secret>"

push:
  port: 8088                # push notification receiver port

database:
  url: sqlite:///./gateway.db

bacnet:
  enabled: true
  ip: 192.168.1.50/24
  device_id: 4001

zkbio:
  base_url: https://<zkbio-host>
  username: admin
  password: <password>
  page_size: 100
```

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Obtain JWT access token |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Basic liveness check |
| `GET` | `/api/health` | Detailed subsystem health (gateway, SQLite, Modbus, HikCentral, ZKBio) |

### Device Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/devices/cameras` | List all cameras with Modbus mapping |
| `GET` | `/api/devices/cameras/{id}` | Get single camera detail |
| `PATCH` | `/api/devices/cameras/{id}` | Update camera Modbus channel mapping |
| `GET` | `/api/devices/zk` | List all ZK access controllers |
| `PATCH` | `/api/devices/zk/{id}` | Update ZK device slot mapping |

### HikCentral

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hikcentral/nvr` | List NVR/encoder devices (from local DB) |
| `GET` | `/api/hikcentral/nvr/{index_code}` | Get NVR detail |
| `GET` | `/api/hikcentral/cameras` | List cameras (from local DB) |
| `GET` | `/api/hikcentral/encode-devices` | Raw encode-device list from HikCentral |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List users (admin only) |
| `POST` | `/api/users` | Create user (admin only) |
| `DELETE` | `/api/users/{id}` | Delete user (admin only) |

All endpoints (except `/health`, `/api/health`, and login) require a **Bearer JWT token**.

## Modbus Register Map

Modbus TCP server exposes holding registers (FC03) for BAS/SCADA integration.

### Block A — ZK Access Controllers (`40000–40007`)

- 5 devices per register, 3 bits per device
- Bit `+0`: Status (1 = online)
- Bit `+1`: Door Open (1 = open)
- Bit `+2`: Door Closed (1 = closed)
- 8 registers → 40 device slots

### Block B — CCTV Cameras (`40010–40020`)

- 16 cameras per register, 1 bit per camera
- Bit value: `0` = online/active, `1` = offline/fault
- 11 registers → 176 camera slots

Device-to-slot mapping is configured via the `/api/devices` endpoints.

## Database

SQLite file at `./gateway.db` (configurable). Tables are created automatically on startup.

| Table | Description |
|-------|-------------|
| `camera_status` | Camera inventory & online status |
| `nvr_status` | NVR/encoder device status |
| `zk_device_status` | ZKTeco access controller status |
| `users` | Local user accounts |

Run `python migrate.py` to apply schema migrations manually.

## Default Credentials

A default admin account is seeded on first startup:

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

**Change the password immediately after first login.**

## Project Structure

```
backend/
├── run.py                  # Entry point (uvicorn)
├── config.yaml             # Default configuration
├── migrate.py              # DB migration helper
├── requirements.txt
└── app/
    ├── main.py             # FastAPI app factory
    ├── config.py           # Pydantic settings loader
    ├── models.py           # SQLAlchemy ORM models
    ├── schemas.py          # Pydantic request/response schemas
    ├── auth.py             # JWT helpers
    ├── db.py               # Database engine / session
    ├── state.py            # Global runtime state
    ├── api/
    │   ├── routes.py       # Health & Modbus status routes
    │   ├── auth.py         # Login endpoint
    │   ├── device_management.py  # Camera & ZK device CRUD
    │   ├── hikcentral.py   # HikCentral proxy & sync routes
    │   └── users.py        # User management
    └── services/
        ├── hikcentral_client.py  # HikCentral ISAPI client
        ├── zk_client.py          # ZKBio REST client
        ├── modbus_server.py      # Modbus TCP server
        └── poller.py             # Background polling thread
```

## Project Structure

```
app/
├── api/
│   ├── routes.py          # Router aggregation
│   ├── access_push.py     # Hikvision push-notification endpoint
│   └── door_control.py    # Door open/close endpoints
├── services/
│   ├── hikvision.py       # ISAPI HTTP client
│   ├── poller.py          # Background polling loop
│   ├── state_engine.py    # State management & persistence
│   ├── bacnet_server.py   # BACnet/IP server wrapper
│   └── event_parser.py    # Raw payload normalisation
├── config.py              # Settings (pydantic-settings + YAML)
├── db.py                  # SQLAlchemy async engine & session
├── models.py              # ORM models
├── schemas.py             # Pydantic request/response schemas
└── main.py                # FastAPI application factory
config.yaml                # Runtime configuration
requirements.txt
run.py                     # Uvicorn entry point
```
