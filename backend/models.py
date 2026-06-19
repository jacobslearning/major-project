from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, Float, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)

    users = relationship("User", back_populates="role")


class IncidentType(Base):
    __tablename__ = "incident_types"

    incident_type_id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text)

    incidents = relationship("Incident", back_populates="incident_type")


class Source(Base):
    __tablename__ = "sources"

    source_id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, nullable=False)
    source_type = Column(String)
    source_url = Column(String, unique=True, index=True)
    update_frequency = Column(String)
    reliability_notes = Column(Text)
    reliability_score = Column(Integer)

    incidents = relationship("Incident", back_populates="source")


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    incident_type_id = Column(Integer, ForeignKey("incident_types.incident_type_id"), index=True)
    source_id = Column(Integer, ForeignKey("sources.source_id"), index=True)
    incident_date = Column(DateTime, index=True)
    country = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    severity = Column(String, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    incident_type = relationship("IncidentType", back_populates="incidents", lazy="joined")
    source = relationship("Source", back_populates="incidents", lazy="joined")

    @property
    def type(self):
        return self.incident_type.type if self.incident_type else None

    @property
    def date_occurred(self):
        return self.incident_date

    @property
    def source_url(self):
        return self.source.source_url if self.source else None


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    role = relationship("Role", back_populates="users", lazy="joined")

    @property
    def id(self):
        return self.user_id
