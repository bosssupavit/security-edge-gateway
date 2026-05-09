from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = 'CHANGE_THIS_SECRET_KEY'
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/auth/login')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def authenticate_user(username: str, password: str):
    from app.db import SessionLocal
    from app.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.username == username,
            User.enabled == True,
        ).first()

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user
    finally:
        db.close()


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=15)
    )

    to_encode.update({'exp': expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({'exp': expire, 'type': 'refresh'})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('type') != 'refresh':
            return None
        return payload.get('sub')
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.db import SessionLocal
    from app.models import User

    credentials_exception = HTTPException(
        status_code=401,
        detail='Could not validate credentials',
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.username == username,
            User.enabled == True,
        ).first()
    finally:
        db.close()

    if user is None:
        raise credentials_exception

    return user
