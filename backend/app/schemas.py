# backend/app/schemas.py
from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class DiagramCreate(BaseModel):
    title: str
    data: str
