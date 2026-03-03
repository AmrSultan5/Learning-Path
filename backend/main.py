from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import engine, SessionLocal
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import models
from ai.openai_service import generate_learning_recommendation
from ai.course_loader import parse_rating
import json
import pandas as pd
import re

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://learning-path-tau.vercel.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

course_links_df = pd.read_csv("data/DIAI Academy eLearning details(Sheet2).csv")

course_links_map = dict(
    zip(course_links_df["learning_path"], course_links_df["link"])
)

# Build a submodule-level ratings lookup from CSV
# Key: (learning_path, sub_module) → rating value or None
course_details_df = pd.read_csv("data/DIAI Academy eLearning details(Sheet1).csv")
submodule_ratings_map = {}
for _, row in course_details_df.iterrows():
    lps = [lp.strip() for lp in str(row["learning_path"]).split(",")]
    sub_name = str(row["sub_module"])
    rating = parse_rating(row.get("user_feedback", ""))
    for lp in lps:
        submodule_ratings_map[(lp, sub_name)] = rating

# ----------------------------
# Database Dependency
# ----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# Database Schema
# ----------------------------
class ResponseCreate(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    written_answer: Optional[str] = None


class LearningPathOut(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime]
    job_function: Optional[str]
    experience: Optional[str]
    time_available: Optional[str]
    interests: Optional[str]
    recommended_path: Optional[str]
    ai_summary: Optional[Dict[str, Any]]
    total_submodules: Optional[int]

    class Config:
        orm_mode = True


class DraftOut(BaseModel):
    id: int
    responses: List[ResponseCreate]

    class Config:
        orm_mode = True

class UsernameRequest(BaseModel):
    username: str

class CompleteRequest(BaseModel):
    job_function: Optional[str]
    experience: Optional[str]
    interests: Optional[List[str]] = None
    goals: Optional[List[str]] = None

class ProgressSaveRequest(BaseModel):
    username: str
    learning_path_id: int
    progress_json: Dict[str, bool]
    overall_progress: int


class ProgressOut(BaseModel):
    progress_json: Dict[str, bool]
    overall_progress: int
    class Config:
        orm_mode = True

class SessionStartRequest(BaseModel):
    username: str


class SessionEndRequest(BaseModel):
    session_id: int


class ActivityLogRequest(BaseModel):
    username: str
    session_id: int
    screen_name: str
    enter_time: datetime
    exit_time: datetime
    duration_seconds: int

# ----------------------------
# Helper Functions
# ----------------------------

def parse_time_available(time_available: str):
    if not time_available:
        return 120  # default 2 hours

    time_available = time_available.lower()

    digits = ''.join(filter(str.isdigit, time_available))

    if digits:
        hours = int(digits)
        return hours * 60

    return 120

def adapt_to_time(ai_result, total_budget_minutes, experience=None, interests=None):

    if not ai_result or "selected_paths" not in ai_result:
        return ai_result

    max_minutes = total_budget_minutes
    total = 0
    used_submodules = set()

    scored_submodules = []

    # Flatten new structure
    for path in ai_result["selected_paths"]:
        path_name = path["learning_path"]

        for module in path["modules"]:
            module_name = module["module_name"]
            module_name_lower = module_name.lower()

            for sub in module["submodules"]:

                sub_name = (sub.get("name") or "").lower()
                duration = sub.get("duration", 0)

                score = 0

                # Beginner boost
                foundational_keywords = ["intro", "fundamentals", "basics"]
                if experience == "beginner":
                    if any(k in module_name_lower or k in sub_name for k in foundational_keywords):
                        score += 50

                # Advanced boost
                advanced_keywords = ["advanced", "deep", "optimization"]
                if experience == "advanced":
                    if any(k in module_name_lower or k in sub_name for k in advanced_keywords):
                        score += 50

                # Interest boost
                if interests:
                    interest_words = interests.lower().split()
                    sub_words = sub_name.split()

                    if any(word in sub_words for word in interest_words):
                        score += 40

                # Short duration boost
                if duration <= 30:
                    score += 10

                scored_submodules.append({
                    "path": path_name,
                    "module": module_name,
                    "sub": sub,
                    "score": score
                })

    # Sort by score
    scored_submodules.sort(key=lambda x: x["score"], reverse=True)

    adapted_paths = {}

    for item in scored_submodules:

        sub_name = (item["sub"].get("name") or "").lower()
        duration = item["sub"].get("duration", 0)

        if sub_name in used_submodules:
            continue

        if total + duration > max_minutes:
            continue

        path_name = item["path"]
        module_name = item["module"]

        if path_name not in adapted_paths:
            adapted_paths[path_name] = []

        # Check if module already exists
        module_entry = next(
            (m for m in adapted_paths[path_name] if m["module_name"] == module_name),
            None
        )

        if not module_entry:
            module_entry = {
                "module_name": module_name,
                "submodules": []
            }
            adapted_paths[path_name].append(module_entry)

        module_entry["submodules"].append(item["sub"])

        used_submodules.add(sub_name)
        total += duration

    # Convert dictionary to list structure again
    final_paths = []

    for path_name, modules in adapted_paths.items():
        final_paths.append({
            "learning_path": path_name,
            "modules": modules
        })

    TOTAL_WEEKS = 12

    if total_budget_minutes <= 0:
        return ai_result

    weekly_capacity = total_budget_minutes / TOTAL_WEEKS if TOTAL_WEEKS else 0
    actual_weeks_needed = total / weekly_capacity if weekly_capacity else 0

    ai_result["selected_paths"] = final_paths
    ai_result["total_minutes"] = total
    ai_result["estimated_weeks"] = round(actual_weeks_needed, 1)
    ai_result["weekly_load_hours"] = round((total / TOTAL_WEEKS) / 60, 1)

    return ai_result

# ----------------------------
# Routes
# ----------------------------

@app.get("/")
def home():
    return {"message": "Backend is running 🥤"}

@app.post("/session/start")
def start_session(data: SessionStartRequest, db: Session = Depends(get_db)):

    # Ensure user exists
    user = db.query(models.User).filter(
        models.User.username == data.username
    ).first()

    if not user:
        user = models.User(username=data.username)
        db.add(user)
        db.commit()

    session = models.UserSession(username=data.username)
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "login_time": session.login_time
    }

@app.post("/session/end")
async def end_session(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    session_id = data.get("session_id")

    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id
    ).first()

    if session:
        session.logout_time = datetime.utcnow()
        db.commit()

    return {"message": "Session closed"}

@app.post("/activity/log")
def log_activity(data: ActivityLogRequest, db: Session = Depends(get_db)):

    activity = models.ScreenActivity(
        username=data.username,
        session_id=data.session_id,
        screen_name=data.screen_name,
        enter_time=data.enter_time,
        exit_time=data.exit_time,
        duration_seconds=data.duration_seconds
    )

    db.add(activity)
    db.commit()

    return {"message": "Activity logged"}

@app.post("/learning-paths/draft")
def create_or_get_draft(data: UsernameRequest, db: Session = Depends(get_db)):

    username = data.username

    draft = db.query(models.LearningPath).filter(
        models.LearningPath.username == username,
        models.LearningPath.status == "draft"
    ).first()

    if draft:
        return {"path_id": draft.id}

    # create user if not exists
    user = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if not user:
        user = models.User(username=username)
        db.add(user)
        db.commit()

    new_draft = models.LearningPath(
        username=username,
        name="Draft Learning Path",
        status="draft"
    )

    db.add(new_draft)
    db.commit()
    db.refresh(new_draft)

    return {"path_id": new_draft.id}

@app.post("/learning-path/{path_id}/response")
def save_response(path_id: int, response: ResponseCreate, db: Session = Depends(get_db)):

    existing = db.query(models.Response).filter(
        models.Response.learning_path_id == path_id,
        models.Response.question_id == response.question_id
    ).first()

    if existing:
        existing.selected_option = response.selected_option
        existing.written_answer = response.written_answer
    else:
        new_response = models.Response(
            learning_path_id=path_id,
            question_id=response.question_id,
            selected_option=response.selected_option,
            written_answer=response.written_answer
        )
        db.add(new_response)

    db.commit()

    return {"message": "Saved"}

@app.get("/learning-paths/{username}/draft", response_model=DraftOut)
def get_draft(username: str, db: Session = Depends(get_db)):

    draft = db.query(models.LearningPath).filter(
        models.LearningPath.username == username,
        models.LearningPath.status == "draft"
    ).first()

    if not draft:
        return {"id": None, "responses": []}

    responses = db.query(models.Response).filter(
        models.Response.learning_path_id == draft.id
    ).all()

    return {
        "id": draft.id,
        "responses": responses
    }

@app.post("/learning-path/{path_id}/complete")
def complete_learning_path(
    path_id: int,
    request: CompleteRequest,
    db: Session = Depends(get_db)
):

    path = db.query(models.LearningPath).filter(
        models.LearningPath.id == path_id
    ).first()

    if not path:
        raise HTTPException(status_code=404, detail="Not found")

    # Get responses
    responses = db.query(models.Response).filter(
        models.Response.learning_path_id == path_id
    ).all()

    if not responses:
        raise HTTPException(status_code=400, detail="No responses found")
    
    # Save profile info
    path.job_function = request.job_function
    path.experience = request.experience
    path.interests = ",".join(request.interests or [])

    TIME_QUESTION_ID = "question_4"

    time_response = next(
        (r for r in responses if r.question_id == TIME_QUESTION_ID),
        None
    )

    if not time_response or not time_response.selected_option:
        raise HTTPException(
            status_code=400,
            detail="Time availability not provided in responses"
        )

    path.time_available = f"{time_response.selected_option} hours"

    # 🔹 Map DB question IDs to semantic labels
    question_map = {
        "question_0": "Job Function",
        "question_1": "Experience Level",
        "question_2": "Primary Interest Areas",
        "question_3": "Learning Goals",
        "question_4": "Total Time Available (Hours for 3 Months)"
    }

    profile_data = {
        "Job Function": None,
        "Experience Level": None,
        "Primary Interest Areas": None,
        "Learning Goals": None,
        "Total Time Available (Hours for 3 Months)": None,
        "Additional Details": []
    }

    for r in responses:
        label = question_map.get(r.question_id)

        if r.selected_option and label:
            profile_data[label] = r.selected_option

        if r.written_answer:
            profile_data["Additional Details"].append(r.written_answer)

    answers_text = f"""User Profile:
Job Function: {profile_data["Job Function"]}
Experience Level: {profile_data["Experience Level"]}
Primary Interest Areas: {profile_data["Primary Interest Areas"]}
Learning Goals: {profile_data["Learning Goals"]}
Total Time Available (Next 3 Months): {profile_data["Total Time Available (Hours for 3 Months)"]} hours

Additional Context:
{"; ".join(profile_data["Additional Details"])}
"""

    # 1️⃣ Generate AI recommendation
    ai_result = generate_learning_recommendation(
        answers_text,
        path.time_available
    )

    # 2️⃣ Parse weekly minutes
    total_budget_minutes = parse_time_available(path.time_available or "")

    # 3️⃣ Adapt to user profile
    ai_result = adapt_to_time(
        ai_result,
        total_budget_minutes,
        experience=path.experience,
        interests=" ".join(request.interests or [])
    )

    # Attach course links to each selected path
    for selected_path in ai_result.get("selected_paths", []):
        path_name = selected_path.get("learning_path")
        selected_path["link"] = course_links_map.get(path_name)

    # 4️⃣ Save results
    path.recommended_path = "AI Generated Path"
    path.ai_summary = ai_result

    total_submodules = sum(
        len(module["submodules"])
        for selected_path in ai_result.get("selected_paths", [])
        for module in selected_path.get("modules", [])
    )

    path.total_submodules = total_submodules
    path.status = "completed"

    db.commit()

    return {
        "message": "Learning path completed",
        "recommended_path": "AI Generated Path",
        "ai_summary": ai_result
    }

@app.get("/learning-paths/{username}", response_model=List[LearningPathOut])
def get_learning_paths(username: str, db: Session = Depends(get_db)):

    paths = db.query(models.LearningPath).filter(
        models.LearningPath.username == username,
        models.LearningPath.status == "completed"
    ).order_by(desc(models.LearningPath.created_at)).all()

    return paths

@app.get("/learning-path/{path_id}", response_model=LearningPathOut)
def get_learning_path_by_id(path_id: int, db: Session = Depends(get_db)):

    path = db.query(models.LearningPath).filter(
        models.LearningPath.id == path_id,
        models.LearningPath.status == "completed"
    ).first()

    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    return path

@app.post("/progress")
def save_progress(data: ProgressSaveRequest, db: Session = Depends(get_db)):

    existing = db.query(models.LearningProgress).filter(
        models.LearningProgress.username == data.username,
        models.LearningProgress.learning_path_id == data.learning_path_id
    ).first()

    if existing:
        existing.progress_json = data.progress_json
        existing.overall_progress = data.overall_progress
    else:
        new_progress = models.LearningProgress(
            username=data.username,
            learning_path_id=data.learning_path_id,
            progress_json=data.progress_json,
            overall_progress=data.overall_progress
        )
        db.add(new_progress)

    db.commit()

    return {"message": "Progress saved"}

@app.get("/progress", response_model=ProgressOut)
def get_progress(username: str, learning_path_id: int, db: Session = Depends(get_db)):

    progress = db.query(models.LearningProgress).filter(
        models.LearningProgress.username == username,
        models.LearningProgress.learning_path_id == learning_path_id
    ).first()

    if not progress:
        return {
            "progress_json": {},
            "overall_progress": 0
        }

    return progress

@app.get("/analytics/user/{username}")
def get_user_analytics(username: str, db: Session = Depends(get_db)):

    sessions = db.query(models.UserSession).filter(
        models.UserSession.username == username
    ).order_by(desc(models.UserSession.login_time)).all()

    result = []

    for session in sessions:

        activities = db.query(models.ScreenActivity).filter(
            models.ScreenActivity.session_id == session.id
        ).all()

        screens = []

        for act in activities:
            screens.append({
                "screen": act.screen_name,
                "enter_time": act.enter_time,
                "exit_time": act.exit_time,
                "duration_seconds": act.duration_seconds
            })

        result.append({
            "session_id": session.id,
            "login_time": session.login_time,
            "logout_time": session.logout_time,
            "screens": screens
        })

    return {
        "username": username,
        "sessions": result
    }

@app.get("/analytics/user/{username}/summary")
def get_user_summary(username: str, db: Session = Depends(get_db)):

    sessions = db.query(models.UserSession).filter(
        models.UserSession.username == username
    ).all()

    total_sessions = len(sessions)

    total_time = 0

    for session in sessions:
        if session.logout_time:
            total_time += (session.logout_time - session.login_time).total_seconds()

    activities = db.query(models.ScreenActivity).filter(
        models.ScreenActivity.username == username
    ).all()

    screen_time = {}

    for act in activities:
        screen_time[act.screen_name] = screen_time.get(act.screen_name, 0) + act.duration_seconds

    return {
        "username": username,
        "total_sessions": total_sessions,
        "total_time_minutes": round(total_time / 60, 1),
        "time_per_screen_seconds": screen_time
    }


def compute_path_ratings(ai_summary):
    """Compute average rating per learning path part from ai_summary."""
    if not ai_summary or "selected_paths" not in ai_summary:
        return {}

    result = {}
    for selected_path in ai_summary["selected_paths"]:
        path_name = selected_path.get("learning_path", "")
        ratings = []

        for module in selected_path.get("modules", []):
            for sub in module.get("submodules", []):
                # Try from ai_summary first (new paths have rating field)
                r = sub.get("rating")
                if r is None:
                    # Fallback: look up from CSV-based map
                    sub_name = sub.get("name", "")
                    r = submodule_ratings_map.get((path_name, sub_name))
                if r is not None:
                    ratings.append(r)

        if ratings:
            result[path_name] = round(sum(ratings) / len(ratings), 1)

    return result


@app.get("/ratings/learning-path/{path_id}")
def get_learning_path_ratings(path_id: int, db: Session = Depends(get_db)):
    """Get per-part average ratings for a single learning path."""
    path = db.query(models.LearningPath).filter(
        models.LearningPath.id == path_id
    ).first()

    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    return compute_path_ratings(path.ai_summary)


@app.get("/ratings/user/{username}")
def get_user_ratings(username: str, db: Session = Depends(get_db)):
    """Get average ratings for all of a user's learning paths (for dashboard)."""
    paths = db.query(models.LearningPath).filter(
        models.LearningPath.username == username,
        models.LearningPath.status == "completed"
    ).all()

    result = {}
    for lp in paths:
        part_ratings = compute_path_ratings(lp.ai_summary)
        if part_ratings:
            all_ratings = list(part_ratings.values())
            result[str(lp.id)] = round(sum(all_ratings) / len(all_ratings), 1)

    return result
