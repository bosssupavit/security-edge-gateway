# Security Edge Gateway

An edge gateway service that bridges **Hikvision** access-control devices with a **BACnet/IP** network, exposing a REST API for door control and access-push event ingestion.

## Architecture

```
Hikvision Device
      │
      ├─ push notifications ──► POST /api/v1/access/push
      │
      └─ ISAPI polling ◄──────  Poller service (background)
                                        │
                                   State Engine
                                        │
                                 ┌──────┴──────┐
                               SQLite        BACnet/IP
                              (history)      (live state)
```

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Edit config
cp config.yaml config.yaml.local
# set hikvision_host, credentials, door_ids …

# Run
python run.py
```

API docs are available at `http://localhost:8000/docs`.

## Configuration

All settings can be overridden via `config.yaml` or environment variables (`.env` file).

| Key | Default | Description |
|-----|---------|-------------|
| `hikvision_host` | `192.168.1.64` | IP of the Hikvision device |
| `hikvision_user` | `admin` | ISAPI username |
| `hikvision_password` | `changeme` | ISAPI password |
| `bacnet_ip` | `0.0.0.0` | BACnet/IP bind address |
| `bacnet_port` | `47808` | BACnet/IP UDP port |
| `database_url` | SQLite local file | SQLAlchemy async URL |
| `poll_interval_seconds` | `5` | Polling frequency |
| `door_ids` | `[]` | List of door identifiers to manage |

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
