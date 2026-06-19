import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

TEST_DB_PATH = ROOT_DIR / ".pytest_incidents.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from auth import create_access_token, hash_password
from database import Base, SessionLocal, engine
from main import app
from models import Role, User


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(db_session):
    role = Role(role_name="analyst", description="Test analyst role")
    db_session.add(role)
    db_session.flush()

    user = User(
        username="tester",
        email="tester@example.com",
        password_hash=hash_password("password123"),
        role_id=role.role_id,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token({"sub": user.username})
    return {"Authorization": f"Bearer {token}"}


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    try:
        TEST_DB_PATH.unlink()
    except FileNotFoundError:
        pass
    except PermissionError:
        pass