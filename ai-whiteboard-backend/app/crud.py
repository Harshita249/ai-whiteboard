from sqlmodel import Session, select
from .models import User, Diagram
from .auth import hash_password, verify_password

def create_user(session: Session, username: str, password: str, email: str = None):
    user = User(username=username, password_hash=hash_password(password), email=email)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def authenticate_user(session: Session, username: str, password: str):
    statement = select(User).where(User.username == username)
    result = session.exec(statement).first()
    if not result:
        return None
    if not verify_password(password, result.password_hash):
        return None
    return result

def create_diagram(session: Session, owner_id: int, title: str, data: str, thumbnail: str = None):
    d = Diagram(owner_id=owner_id, title=title, data=data, thumbnail=thumbnail)
    session.add(d)
    session.commit()
    session.refresh(d)
    return d

def list_diagrams_for_user(session: Session, owner_id: int):
    statement = select(Diagram).where(Diagram.owner_id == owner_id).order_by(Diagram.created_at.desc())
    return session.exec(statement).all()
