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


with Path('config.yaml').open('r', encoding='utf-8') as f:
    raw = yaml.safe_load(f)

settings = Settings(**raw)
