from pydantic import BaseModel


class UpdateCameraStatusRequest(BaseModel):
    camera_name: str | None = None
    ip_address: str | None = None
    channel_no: int | None = None          # bit position 0-15 within the register
    modbus_register: int | None = None     # actual register number e.g. 40010


class UpdateZkDeviceRequest(BaseModel):
    alias: str | None = None
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
