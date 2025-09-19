from sqlmodel import SQLModel, Field, JSON
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: Optional[str] = None
    password_hash: str

class Diagram(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(index=True)
    title: Optional[str] = ""
    data: str  # JSON serialized string of canvas (fabric.js or custom)
    thumbnail: Optional[str] = None  # base64 small preview optional
    created_at: datetime = Field(default_factory=datetime.utcnow)
