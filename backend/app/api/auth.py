from datetime import timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import (
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix='/api/auth', tags=['auth'])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post('/login')
def login(data: LoginRequest):
    user = authenticate_user(data.username, data.password)

    if not user:
        raise HTTPException(status_code=401, detail='Invalid username or password')

    access_token = create_access_token(
        data={'sub': user.username, 'role': user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        'access_token': access_token,
        'token_type': 'bearer',
        'username': user.username,
        'role': user.role,
    }
