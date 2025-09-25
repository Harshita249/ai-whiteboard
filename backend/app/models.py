from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)

    # Relationship to diagrams
    diagrams = relationship("Diagram", back_populates="owner_user", cascade="all, delete-orphan")


class Diagram(Base):
    __tablename__ = "diagrams"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(256))
    data_json = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to User
    owner_user = relationship("User", back_populates="diagrams")
