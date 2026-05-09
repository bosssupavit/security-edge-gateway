from datetime import timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix='/api/auth', tags=['auth'])


class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str


@router.post('/login')
def login(data: LoginRequest):
    user = authenticate_user(data.username, data.password)

    if not user:
        raise HTTPException(status_code=401, detail='Invalid username or password')

    access_token = create_access_token(
        data={'sub': user.username, 'role': user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={'sub': user.username, 'role': user.role})

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'bearer',
        'username': user.username,
        'role': user.role,
    }


@router.post('/refresh')
def refresh(data: RefreshRequest):
    username = verify_refresh_token(data.refresh_token)
    if not username:
        raise HTTPException(status_code=401, detail='Invalid or expired refresh token')

    from app.db import SessionLocal
    from app.models import User
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username, User.enabled == True).first()
        if not user:
            raise HTTPException(status_code=401, detail='User not found or disabled')
        
        access_token = create_access_token(
            data={'sub': user.username, 'role': user.role},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        refresh_token = create_refresh_token(data={'sub': user.username, 'role': user.role})
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'username': user.username,
            'role': user.role,
        }
    finally:
        db.close()
