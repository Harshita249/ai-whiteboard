from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: Optional[str] = None
    hashed_password: str

    diagrams: List["Diagram"] = Relationship(back_populates="owner")

class Diagram(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    title: Optional[str] = ""
    data: str  # JSON serialized canvas state
    thumbnail: Optional[str] = None

    owner: Optional[User] = Relationship(back_populates="diagrams")
