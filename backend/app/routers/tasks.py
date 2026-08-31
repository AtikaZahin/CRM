from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskResponse
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

from datetime import datetime
from typing import Optional

def check_time_conflict(db: Session, user_id: int, start_time: Optional[datetime], end_time: Optional[datetime], exclude_task_id: Optional[int] = None):
    if not start_time or not end_time:
        return
        
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)

    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )

    query = db.query(Task).filter(
        Task.user_id == user_id,
        Task.start_time.isnot(None),
        Task.end_time.isnot(None),
        Task.start_time < end_time,
        Task.end_time > start_time
    )

    if exclude_task_id:
        query = query.filter(Task.id != exclude_task_id)

    conflicting_task = query.first()
    if conflicting_task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already booked: Time slot clashes with task '{conflicting_task.title}'"
        )

@router.get("/", response_model=List[TaskResponse])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(Task).offset(skip).limit(limit).all()
    return tasks

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_time_conflict(db, current_user.id, task.start_time, task.end_time)
    db_task = Task(**task.model_dump(), user_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/{task_id}", response_model=TaskResponse)
def read_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    check_time_conflict(db, current_user.id, task.start_time, task.end_time, exclude_task_id=task_id)

    for key, value in task.model_dump().items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return None
