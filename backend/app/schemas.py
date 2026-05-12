import uuid
from typing import Optional

from pydantic import BaseModel, Field


class CreateCameraRequest(BaseModel):
    index_code: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4)
    camera_name: str
    ip_address: str = ''
    channel_no: int | None = None          # bit position 0-15 within the register
    modbus_register: int | None = None     # actual register number e.g. 40010


class UpdateCameraStatusRequest(BaseModel):
    camera_name: str | None = None
    ip_address: str | None = None
    channel_no: int | None = None          # bit position 0-15 within the register
    modbus_register: int | None = None     # actual register number e.g. 40010


class UpdateZkDeviceRequest(BaseModel):
    ip_address: str | None = None
    slot_no: int | None = None             # device slot 0-4 within the register
    modbus_register: int | None = None     # actual register number e.g. 40000


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = 'operator'


class UpdateUserRequest(BaseModel):
    password: str | None = None
    role: str | None = None
    enabled: bool | None = None
