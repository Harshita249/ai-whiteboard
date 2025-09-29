
from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class DiagramIn(BaseModel):
    title: Optional[str]
    data_json: str

class DiagramCreate(BaseModel):
    title: str
    data: str  # base64/png
