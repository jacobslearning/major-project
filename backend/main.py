from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import os

from database import engine, Base
from models import Incident, User, Role, IncidentType, Source
from schemas import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentTypeCreate,
    IncidentTypeResponse,
    SourceCreate,
    SourceResponse,
    RoleCreate,
    RoleResponse,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    TokenData,
    Token,
    UserUpdate,
    AdminUserCreate,
)
from auth import (
    get_db,
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    require_administrator
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Overseas Incident Backend")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.7.214:3000",
    "http://172.21.80.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def schema_to_dict(schema, *, exclude_unset: bool = False) -> dict:
    if hasattr(schema, "model_dump"):
        return schema.model_dump(exclude_unset=exclude_unset)
    return schema.dict(exclude_unset=exclude_unset)


def get_or_create_default_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.role_name == "analyst").first()
    if role:
        return role

    role = Role(role_name="analyst", description="Default application analyst")
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def get_or_create_incident_type(db: Session, type_name: Optional[str]) -> Optional[IncidentType]:
    if not type_name:
        return None

    clean_type = type_name.strip()
    if not clean_type:
        return None

    incident_type = db.query(IncidentType).filter(IncidentType.type == clean_type).first()
    if incident_type:
        return incident_type

    incident_type = IncidentType(type=clean_type)
    db.add(incident_type)
    db.commit()
    db.refresh(incident_type)
    return incident_type


def get_or_create_source(db: Session, source_url: Optional[str]) -> Optional[Source]:
    if not source_url:
        return None

    clean_url = source_url.strip()
    if not clean_url:
        return None

    source = db.query(Source).filter(Source.source_url == clean_url).first()
    if source:
        return source

    source = Source(source_name=clean_url, source_type="url", source_url=clean_url)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def normalise_incident_payload(db: Session, payload, *, exclude_unset: bool = False) -> dict:
    data = schema_to_dict(payload, exclude_unset=exclude_unset)

    legacy_type = data.pop("type", None)
    legacy_date = data.pop("date_occurred", None)
    legacy_source_url = data.pop("source_url", None)

    if not data.get("incident_date") and legacy_date:
        data["incident_date"] = legacy_date

    if not data.get("incident_type_id") and legacy_type:
        incident_type = get_or_create_incident_type(db, legacy_type)
        data["incident_type_id"] = incident_type.incident_type_id if incident_type else None

    if not data.get("source_id") and legacy_source_url:
        source = get_or_create_source(db, legacy_source_url)
        data["source_id"] = source.source_id if source else None

    allowed_fields = {
        "title",
        "description",
        "incident_type_id",
        "source_id",
        "incident_date",
        "country",
        "latitude",
        "longitude",
        "severity",
    }
    return {key: value for key, value in data.items() if key in allowed_fields}


@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role_id = user_in.role_id
    if role_id is None:
        role_id = get_or_create_default_role(db).role_id
    elif not db.query(Role).filter(Role.role_id == role_id).first():
        raise HTTPException(status_code=400, detail="Role not found")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role_id=role_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role.role_name if user.role else None,
            "role_id": user.role_id,
            },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/users/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_administrator),
):
    return (
        db.query(User)
        .options(joinedload(User.role))
        .order_by(User.username)
        .all()
    )


@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_admin(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_administrator),
):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = db.query(Role).filter(Role.role_id == user_in.role_id).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role_id=role.role_id,
        is_active=user_in.is_active,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_token: TokenData = Depends(require_administrator),
):
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.user_id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username == admin_token.username:
        raise HTTPException(
            status_code=400,
            detail="Administrators cannot change their own role",
        )

    role = db.query(Role).filter(Role.role_id == role_update.role_id).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    user.role_id = role.role_id

    db.commit()
    db.refresh(user)

    return user


@app.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin_token: TokenData = Depends(require_administrator),
):
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.user_id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = schema_to_dict(user_update, exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update fields provided")

    is_self_update = user.username == admin_token.username

    if is_self_update:
        if "role_id" in update_data:
            new_role = db.query(Role).filter(Role.role_id == update_data["role_id"]).first()

            if not new_role:
                raise HTTPException(status_code=404, detail="Role not found")

            if new_role.role_name != "administrator":
                raise HTTPException(
                    status_code=400,
                    detail="Administrators cannot demote themselves",
                )

        if update_data.get("is_active") is False:
            raise HTTPException(
                status_code=400,
                detail="Administrators cannot deactivate themselves",
            )

    if "username" in update_data:
        existing_user = (
            db.query(User)
            .filter(User.username == update_data["username"])
            .filter(User.user_id != user_id)
            .first()
        )

        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")

        user.username = update_data["username"]

    if "email" in update_data:
        existing_email = (
            db.query(User)
            .filter(User.email == update_data["email"])
            .filter(User.user_id != user_id)
            .first()
        )

        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")

        user.email = update_data["email"]

    if "password" in update_data:
        user.password_hash = hash_password(update_data["password"])

    if "role_id" in update_data:
        role = db.query(Role).filter(Role.role_id == update_data["role_id"]).first()

        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        user.role_id = role.role_id

    if "is_active" in update_data:
        user.is_active = update_data["is_active"]

    db.commit()
    db.refresh(user)

    return user


@app.post("/roles/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if db.query(Role).filter(Role.role_name == role_in.role_name).first():
        raise HTTPException(status_code=400, detail="Role already exists")
    role = Role(**schema_to_dict(role_in))
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@app.get("/roles/", response_model=List[RoleResponse])
def list_roles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Role).order_by(Role.role_name).all()


@app.post("/incident-types/", response_model=IncidentTypeResponse, status_code=status.HTTP_201_CREATED)
def create_incident_type(
    incident_type_in: IncidentTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if db.query(IncidentType).filter(IncidentType.type == incident_type_in.type).first():
        raise HTTPException(status_code=400, detail="Incident type already exists")
    incident_type = IncidentType(**schema_to_dict(incident_type_in))
    db.add(incident_type)
    db.commit()
    db.refresh(incident_type)
    return incident_type


@app.get("/incident-types/", response_model=List[IncidentTypeResponse])
def list_incident_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(IncidentType).order_by(IncidentType.type).all()


@app.post("/sources/", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    source_in: SourceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if source_in.source_url and db.query(Source).filter(Source.source_url == source_in.source_url).first():
        raise HTTPException(status_code=400, detail="Source URL already exists")
    source = Source(**schema_to_dict(source_in))
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@app.get("/sources/", response_model=List[SourceResponse])
def list_sources(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Source).order_by(Source.source_name).all()


@app.post("/incidents/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = normalise_incident_payload(db, incident)

    if data.get("incident_type_id") and not db.query(IncidentType).filter(
        IncidentType.incident_type_id == data["incident_type_id"]
    ).first():
        raise HTTPException(status_code=400, detail="Incident type not found")

    if data.get("source_id") and not db.query(Source).filter(Source.source_id == data["source_id"]).first():
        raise HTTPException(status_code=400, detail="Source not found")

    db_incident = Incident(**data)
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident


@app.get("/incidents/", response_model=List[IncidentResponse])
def list_incidents(
    start_date: Optional[datetime] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[datetime] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Incident).options(
        joinedload(Incident.incident_type),
        joinedload(Incident.source),
    )

    if start_date and end_date:
        query = query.filter(Incident.incident_date.between(start_date, end_date))
    elif start_date:
        query = query.filter(Incident.incident_date >= start_date)
    elif end_date:
        query = query.filter(Incident.incident_date <= end_date)

    return query.order_by(Incident.incident_date.desc().nullslast()).all()


@app.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = (
        db.query(Incident)
        .options(joinedload(Incident.incident_type), joinedload(Incident.source))
        .filter(Incident.incident_id == incident_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.put("/incidents/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    updated: IncidentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident = (
        db.query(Incident)
        .options(joinedload(Incident.incident_type), joinedload(Incident.source))
        .filter(Incident.incident_id == incident_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    data = normalise_incident_payload(db, updated, exclude_unset=True)

    if data.get("incident_type_id") and not db.query(IncidentType).filter(
        IncidentType.incident_type_id == data["incident_type_id"]
    ).first():
        raise HTTPException(status_code=400, detail="Incident type not found")

    if data.get("source_id") and not db.query(Source).filter(Source.source_id == data["source_id"]).first():
        raise HTTPException(status_code=400, detail="Source not found")

    for key, value in data.items():
        setattr(incident, key, value)

    db.commit()
    db.refresh(incident)
    return incident


@app.delete("/incidents/{incident_id}")
def delete_incident(
    incident_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"Info": f"Incident {incident_id} deleted"}


@app.get("/daily-brief")
def get_daily_brief():
    file_path = os.path.join("data", "DailyBrief.xml")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="DailyBrief.xml not found")

    return FileResponse(
        path=file_path, media_type="application/rss+xml", filename="DailyBrief.xml"
    )
