from sqlmodel import Session, select
from . import models, auth

def create_user(session: Session, username: str, password: str, email: str = None):
    hashed_pw = auth.hash_password(password)
    user = models.User(username=username, hashed_password=hashed_pw, email=email)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def authenticate_user(session: Session, username: str, password: str):
    stmt = select(models.User).where(models.User.username == username)
    user = session.exec(stmt).first()
    if not user:
        return None
    if not auth.verify_password(password, user.hashed_password):
        return None
    return user

def create_diagram(session: Session, owner_id: int, title: str, data: str, thumbnail: str = None):
    d = models.Diagram(owner_id=owner_id, title=title, data=data, thumbnail=thumbnail)
    session.add(d)
    session.commit()
    session.refresh(d)
    return d

def list_diagrams_for_user(session: Session, owner_id: int):
    stmt = select(models.Diagram).where(models.Diagram.owner_id == owner_id).order_by(models.Diagram.id.desc())
    return session.exec(stmt).all()
