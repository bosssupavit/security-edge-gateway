from pathlib import Path
import yaml
from pydantic import BaseModel


class AppConfig(BaseModel):
    host: str
    port: int
    poll_interval_sec: int
    modbus_host: str = '0.0.0.0'
    modbus_port: int = 502


class PushConfig(BaseModel):
    port: int


class DBConfig(BaseModel):
    url: str


class BACnetConfig(BaseModel):
    enabled: bool
    ip: str
    device_id: int


class HikCentralConfig(BaseModel):
    base_url: str
    app_key: str
    app_secret: str


class ZkBioConfig(BaseModel):
    base_url: str
    access_token: str          # API token from CVSecurity → System Mgmt → API Authorization
    page_size: int = 100


class Settings(BaseModel):
    app: AppConfig
    hikcentral: HikCentralConfig
    zkbio: ZkBioConfig
    push: PushConfig
    database: DBConfig
    bacnet: BACnetConfig


def _config_path() -> Path:
    """Return config.yaml path that works both normally and in a PyInstaller bundle."""
    import sys
    if getattr(sys, 'frozen', False):
        # When running as a frozen exe, look next to the executable
        return Path(sys.executable).parent / 'config.yaml'
    return Path('config.yaml')


with _config_path().open('r', encoding='utf-8') as f:
    raw = yaml.safe_load(f)

settings = Settings(**raw)
