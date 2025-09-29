from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import db, models

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

def get_db():
    db_sess = db.SessionLocal()
    try:
        yield db_sess
    finally:
        db_sess.close()

@router.post("/")
def save_diagram(title: str, data_json: str, db: Session = Depends(get_db)):
    diagram = models.Diagram(title=title, data_json=data_json, owner="guest")
    db.add(diagram)
    db.commit()
    db.refresh(diagram)
    return diagram

@router.get("/")
def list_diagrams(db: Session = Depends(get_db)):
    return db.query(models.Diagram).order_by(models.Diagram.created_at.desc()).all()

@router.get("/{diagram_id}")
def get_diagram(diagram_id: int, db: Session = Depends(get_db)):
    diagram = db.query(models.Diagram).filter(models.Diagram.id == diagram_id).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram

@router.delete("/{diagram_id}")
def delete_diagram(diagram_id: int, db: Session = Depends(get_db)):
    diagram = db.query(models.Diagram).filter(models.Diagram.id == diagram_id).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    db.delete(diagram)
    db.commit()
    return {"msg": "Deleted"}
