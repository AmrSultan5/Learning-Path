from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learning_paths = relationship("LearningPath", back_populates="user")

class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    username = Column(String, ForeignKey("users.username"))

    job_function = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    time_available = Column(String, nullable=True)
    interests = Column(Text, nullable=True)

    recommended_path = Column(String, nullable=True)
    ai_summary = Column(JSON, nullable=True)

    total_submodules = Column(Integer, default=0)

    user = relationship("User", back_populates="learning_paths")
    responses = relationship("Response", back_populates="learning_path")
    status = Column(String, default="draft")  # draft or completed


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)

    learning_path_id = Column(Integer, ForeignKey("learning_paths.id"))

    question_id = Column(String)
    selected_option = Column(String, nullable=True)
    written_answer = Column(Text, nullable=True)

    learning_path = relationship("LearningPath", back_populates="responses")

class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, ForeignKey("users.username"), nullable=False)
    learning_path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)

    progress_json = Column(JSON, nullable=False)
    overall_progress = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, ForeignKey("users.username"), nullable=False)

    login_time = Column(DateTime, default=datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)


class ScreenActivity(Base):
    __tablename__ = "screen_activity"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, ForeignKey("users.username"), nullable=False)
    session_id = Column(Integer, ForeignKey("user_sessions.id"), nullable=False)

    screen_name = Column(String, nullable=False)

    enter_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=False)