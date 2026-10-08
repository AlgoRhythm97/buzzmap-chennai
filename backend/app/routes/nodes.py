from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import SensorNode
from ..schemas import SensorNodeCreate, SensorNodeResponse

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

@router.post("/", response_model=SensorNodeResponse, status_code=status.HTTP_201_CREATED)
def create_node(node: SensorNodeCreate, db: Session = Depends(get_db)):
    """
    Register a new sensing node at a fixed location.
    """
    if db.get(SensorNode, node.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Node {node.id} already exists")

    db_node = SensorNode(**node.model_dump())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@router.get("/", response_model=List[SensorNodeResponse])
def get_nodes(active: Optional[bool] = None, db: Session = Depends(get_db)):
    """
    List registered sensing nodes for the map, optionally filtered by active status.
    """
    query = db.query(SensorNode)
    if active is not None:
        query = query.filter(SensorNode.is_active == active)
    return query.order_by(SensorNode.id).all()

@router.get("/{node_id}", response_model=SensorNodeResponse)
def get_node(node_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a single sensing node.
    """
    db_node = db.get(SensorNode, node_id)
    if db_node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node {node_id} not found")
    return db_node
