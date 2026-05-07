from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password
from app.db import SessionLocal
from app.models import User
from app.schemas import CreateUserRequest, UpdateUserRequest

router = APIRouter(prefix='/api/users', tags=['users'])


def _require_admin(current_user=Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Admin only')
    return current_user


@router.get('/')
def list_users(current_user=Depends(_require_admin)):
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        return [
            {
                'id': u.id,
                'username': u.username,
                'role': u.role,
                'enabled': u.enabled,
                'created_at': u.created_at,
            }
            for u in users
        ]
    finally:
        db.close()


@router.post('/', status_code=201)
def create_user(
    payload: CreateUserRequest,
    current_user=Depends(_require_admin),
):
    db: Session = SessionLocal()
    try:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail='Username already exists')

        user = User(
            username=payload.username,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            enabled=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return {'status': 'created', 'id': user.id}
    finally:
        db.close()


@router.put('/{user_id}')
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    current_user=Depends(_require_admin),
):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        if payload.password is not None:
            user.hashed_password = hash_password(payload.password)
        if payload.role is not None:
            user.role = payload.role
        if payload.enabled is not None:
            user.enabled = payload.enabled

        db.commit()

        return {'status': 'updated'}
    finally:
        db.close()


@router.delete('/{user_id}')
def delete_user(
    user_id: int,
    current_user=Depends(_require_admin),
):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        if user.username == current_user.username:
            raise HTTPException(status_code=400, detail='Cannot delete yourself')

        db.delete(user)
        db.commit()

        return {'status': 'deleted'}
    finally:
        db.close()
