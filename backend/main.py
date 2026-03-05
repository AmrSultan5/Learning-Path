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
import os
import requests as http_requests
from dotenv import load_dotenv
import math

load_dotenv()

#EMBEDDING_CACHE_FILE = os.path.join(
#    os.path.dirname(__file__),
#    "data",
#    "transcript_embeddings.json"
#)

# Force-delete cache on startup (temporary fix)
#if os.path.exists(EMBEDDING_CACHE_FILE):
#    os.remove(EMBEDDING_CACHE_FILE)
#    print("[Hellen+] Deleted old embedding cache")

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
# Hellen+ Transcript Parsing & Chunking
# ----------------------------

def parse_transcripts_with_timestamps(filepath: str) -> Dict[str, List[Dict[str, str]]]:
    """
    Parse Video transcripts.txt into {submodule_title: [{text, timestamp}]}.
    Detects submodule headers (lines ending with ':' followed by blank line),
    timestamp lines (e.g. '9:35' or '0 minutes 8 seconds'), and spoken text.
    """
    result: Dict[str, List[Dict[str, str]]] = {}

    with open(filepath, "r", encoding="utf-8-sig") as f:
        lines = f.readlines()

    current_submodule = None
    current_timestamp = "00:00"
    current_text_parts: List[str] = []

    # Regex for short timestamp like "9:35" or "0:08" or "25:15"
    short_ts_re = re.compile(r"^\d{1,2}:\d{2}$")
    # Regex for long timestamp like "9 minutes 35 seconds" or "0 minutes 8 seconds"
    long_ts_re = re.compile(r"^(\d+)\s+minutes?(?:\s+(\d+)\s+seconds?)?$")
    # Regex for submodule header: text ending with ':' (not a timestamp)
    header_re = re.compile(r"^(.+):\s*$")

    def flush_segment():
        nonlocal current_text_parts
        if current_submodule and current_text_parts:
            text = " ".join(current_text_parts).strip()
            if text:
                result.setdefault(current_submodule, []).append({
                    "text": text,
                    "submodule": current_submodule,
                    "timestamp": current_timestamp
                })
            current_text_parts = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue

        # Check for submodule header: a line ending with ':'
        # followed by an empty line (or end of file)
        header_match = header_re.match(line)
        if header_match:
            candidate = header_match.group(1).strip()
            # Make sure it's not a short timestamp like "1:05"
            if not short_ts_re.match(candidate) and not long_ts_re.match(candidate):
                # Check next line is empty or EOF
                next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
                if next_line == "":
                    flush_segment()
                    current_submodule = candidate
                    current_timestamp = "00:00"
                    current_text_parts = []
                    i += 2  # skip header + blank line
                    continue

        # Check for short timestamp (e.g., "9:35")
        if short_ts_re.match(line):
            flush_segment()
            parts = line.split(":")
            current_timestamp = f"{int(parts[0]):02d}:{parts[1]}"
            i += 1
            continue

        # Check for long timestamp (e.g., "9 minutes 35 seconds")
        long_match = long_ts_re.match(line)
        if long_match:
            # Skip this line — we already captured the short form
            i += 1
            continue

        # It's regular transcript text
        if current_submodule:
            current_text_parts.append(line)

        i += 1

    flush_segment()
    return result


def chunk_segments(segments: List[Dict[str, str]], chunk_size: int = 2000, overlap: int = 400) -> List[Dict[str, str]]:
    """
    Split transcript segments into overlapping chunks of ~chunk_size characters.
    Fix: each chunk uses the segment's own submodule name (not the first segment's).
    """
    if not segments:
        return []

    chunks = []
    current_text = ""
    current_timestamp = segments[0]["timestamp"]
    current_submodule = segments[0]["submodule"]

    for seg in segments:
        seg_submodule = seg["submodule"]
        if len(current_text) + len(seg["text"]) > chunk_size and current_text:
            chunks.append({
                "text": current_text.strip(),
                "submodule": current_submodule,
                "timestamp": current_timestamp
            })
            # Overlap: keep the last `overlap` characters
            overlap_text = current_text[-overlap:] if len(current_text) > overlap else current_text
            current_text = overlap_text
            current_timestamp = seg["timestamp"]
            current_submodule = seg_submodule

        if not current_text:
            current_timestamp = seg["timestamp"]
            current_submodule = seg_submodule

        current_text += " " + seg["text"]

    if current_text.strip():
        chunks.append({
            "text": current_text.strip(),
            "submodule": current_submodule,
            "timestamp": current_timestamp
        })

    return chunks


def build_submodule_chunks(transcript_data: Dict[str, List[Dict[str, str]]]) -> Dict[str, List[Dict[str, str]]]:
    """Build chunked transcript lookup: {submodule_title: [chunks]}."""
    result = {}
    for submodule, segments in transcript_data.items():
        result[submodule] = chunk_segments(segments)
    return result


# ----------------------------
# Embedding Generation (Azure text-embedding-3-small)
# ----------------------------

"""

def _get_embedding(text: str) -> List[float]:
    Generate a single embedding vector from Azure OpenAI.
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

    url = f"{azure_endpoint}/deployments/{embedding_deployment}/embeddings?api-version={api_version}"
    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }
    body = {"input": text[:8000]}  # tiktoken safety: 8k chars ~ ≤ 8k tokens

    resp = http_requests.post(url, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]

"""


"""
def _cosine_similarity(a: List[float], b: List[float]) -> float:
    Cosine similarity between two equal-length vectors.
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

"""

def generate_chunk_embeddings(
    chunks_map: Dict[str, List[Dict[str, str]]]
) -> Dict[str, List[Dict]]:
    """
    Generate embeddings for all chunks. Called only when no cache exists.
    Returns a map where each chunk dict contains an 'embedding' key.
    """
    embedded_map: Dict[str, List[Dict]] = {}
    total = sum(len(v) for v in chunks_map.values())
    done = 0

    for submodule, chunks in chunks_map.items():
        embedded_chunks = []
        for chunk in chunks:
            try:
                emb = _get_embedding(chunk["text"])
            except Exception as e:
                print(f"[Hellen+] Embedding failed for chunk in '{submodule}': {e}")
                emb = []  # empty fallback — will score 0 in similarity
            embedded_chunks.append({
                "text": chunk["text"],
                "submodule": chunk["submodule"],
                "timestamp": chunk["timestamp"],
                "embedding": emb
            })
            done += 1
            if done % 20 == 0:
                print(f"[Hellen+] Embedded {done}/{total} chunks...")

        embedded_map[submodule] = embedded_chunks

    print(f"[Hellen+] Embedding complete: {done}/{total} chunks embedded.")
    return embedded_map


# ----------------------------
# Embedding Disk Cache
# ----------------------------


def _cache_is_valid(transcript_file: str, cache_file: str) -> bool:
    """Return True if cache exists and is newer than the transcript file."""
    if not os.path.exists(cache_file):
        return False
    return os.path.getmtime(cache_file) >= os.path.getmtime(transcript_file)


def load_embedded_chunks_from_cache(cache_file: str) -> Dict[str, List[Dict]]:
    """Load the embedded chunks map from disk."""
    print(f"[Hellen+] Loading embeddings from cache: {cache_file}")
    with open(cache_file, "r", encoding="utf-8") as f:
        flat_list: List[Dict] = json.load(f)
    # Reconstruct {submodule: [chunks]} structure
    result: Dict[str, List[Dict]] = {}
    for chunk in flat_list:
        sub = chunk["submodule"]
        result.setdefault(sub, []).append(chunk)
    total = sum(len(v) for v in result.values())
    print(f"[Hellen+] Loaded {total} cached chunks for {len(result)} submodules.")
    return result


def save_embedded_chunks_to_cache(embedded_map: Dict[str, List[Dict]], cache_file: str) -> None:
    """Flatten and save the embedded chunks map to disk as JSON."""
    flat_list = [chunk for chunks in embedded_map.values() for chunk in chunks]
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(flat_list, f)
    total = len(flat_list)
    print(f"[Hellen+] Saved {total} embedded chunks to cache: {cache_file}")


def retrieve_relevant_chunks(
    query: str,
    submodule_names: List[str],
    embedded_chunks_map: Dict[str, List[Dict]],
    top_k: int = 5,
    min_score: float = 0.1
):
    """
    Keyword-based retrieval (temporary replacement for embeddings).
    """

    STOPWORDS = {
        "the","a","an","is","are","am","was","were",
        "i","me","my","mine","you","your","yours",
        "he","she","it","we","they","them","our","their",

        "and","or","but","not",
        "to","from","at","on","in","by","for","of","with","about","as",

        "what","which","who","how","when","where","why",

        "can","could","will","would","should","do","does","did",

        "hi","hello","hey","thanks","thank","thankyou","thx","ty",

        "ok","okay","alright","cool","nice","great","good","bad",

        "very","really","just","only","also","too","please"
    }

    query_words = {
        w for w in re.findall(r"\b\w+\b", query.lower())
        if w not in STOPWORDS
    }
    scored = []

    for sub_name in submodule_names:
        for chunk in embedded_chunks_map.get(sub_name, []):
            text_words = set(re.findall(r"\b\w+\b", chunk["text"].lower()))
            overlap = len(query_words.intersection(text_words))

            if overlap > 0:
                scored.append((overlap, chunk))

    if not scored:
        return [], 0.0

    scored.sort(key=lambda x: x[0], reverse=True)

    return [c[1] for c in scored[:top_k]], scored[0][0]


# ----------------------------
# Startup: Load, Chunk, Embed (with disk cache)
# ----------------------------

TRANSCRIPT_FILE = os.path.join(os.path.dirname(__file__), "data", "Video transcripts.txt")
transcript_data = parse_transcripts_with_timestamps(TRANSCRIPT_FILE)
submodule_chunks_map = build_submodule_chunks(transcript_data)

print(f"[Hellen+] Loaded transcripts for {len(transcript_data)} submodules")
print(f"[Hellen+] Total chunks: {sum(len(v) for v in submodule_chunks_map.values())}")

# TEMP: embeddings disabled
embedded_chunks_map = {
    sub: [{**c, "embedding": []} for c in chunks]
    for sub, chunks in submodule_chunks_map.items()
}
#print(f"[Hellen+] WARNING: Embedding initialization failed: {e}")
#print("[Hellen+] Hellen+ will have degraded retrieval quality.")
#embedded_chunks_map = {
#    sub: [{**c, "embedding": []} for c in chunks]
#    for sub, chunks in submodule_chunks_map.items()
#}

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

class UserRatingRequest(BaseModel):
    username: str
    learning_path_id: int
    rating: float  # 1.0 - 5.0
    comment: Optional[str] = None

class HellenHistoryMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class HellenChatRequest(BaseModel):
    module_name: str
    submodule_names: List[str]
    message: str
    history: Optional[List[HellenHistoryMessage]] = None

class HellenSourceOut(BaseModel):
    submodule: str
    timestamp: str
    snippet: str

class HellenChatResponse(BaseModel):
    response: str
    sources: List[HellenSourceOut]

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

    # Build reasoning lookup so we don't lose it during rebuild
    reasoning_lookup = {}
    for path in ai_result["selected_paths"]:
        for module in path.get("modules", []):
            key = (path["learning_path"], module["module_name"])
            reasoning_lookup[key] = module.get("reasoning", "")

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
                "reasoning": reasoning_lookup.get((path_name, module_name), ""),
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


class RenameRequest(BaseModel):
    name: str


@app.patch("/learning-path/{path_id}/rename")
def rename_learning_path(
    path_id: int,
    data: RenameRequest,
    db: Session = Depends(get_db)
):
    path = db.query(models.LearningPath).filter(
        models.LearningPath.id == path_id
    ).first()

    if not path:
        raise HTTPException(status_code=404, detail="Not found")

    path.name = data.name
    db.commit()

    return {"message": "Renamed", "name": data.name}

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
    """Get CSV-based average ratings for all of a user's learning paths."""
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


@app.post("/user-rating")
def save_user_rating(data: UserRatingRequest, db: Session = Depends(get_db)):
    """Save or update a user's rating and comment for a learning path."""
    existing = db.query(models.UserRating).filter(
        models.UserRating.username == data.username,
        models.UserRating.learning_path_id == data.learning_path_id
    ).first()

    if existing:
        existing.rating = data.rating
        existing.comment = data.comment
    else:
        new_rating = models.UserRating(
            username=data.username,
            learning_path_id=data.learning_path_id,
            rating=data.rating,
            comment=data.comment
        )
        db.add(new_rating)

    db.commit()
    return {"message": "Rating saved"}


@app.get("/user-ratings/{username}")
def get_all_user_ratings(username: str, db: Session = Depends(get_db)):
    """Get all user-submitted ratings and comments for a user's learning paths."""
    ratings = db.query(models.UserRating).filter(
        models.UserRating.username == username
    ).all()

    result = {}
    for r in ratings:
        result[str(r.learning_path_id)] = {
            "rating": r.rating,
            "comment": r.comment or ""
        }

    return result


# ----------------------------
# Hellen+ Shared Logic
# ----------------------------

HELLEN_TUTOR_SYSTEM_PROMPT = """
You are Hellen+, an AI tutor helping users deeply understand a specific learning module.

Your ONLY source of knowledge is the transcript excerpts provided. You must follow these rules without exception:

1. Answer ONLY using information explicitly stated in the provided transcript excerpts.
2. Do NOT use any outside knowledge, general knowledge, or information not present in the excerpts.
3. If the information needed is NOT in the transcript excerpts, respond EXACTLY with: "This topic is not covered in this module."
4. When answering, quote or closely paraphrase the relevant transcript text.
5. Always state which submodule the information comes from (e.g. "According to [Submodule Name]...").
6. Be concise. Do not add filler, assumptions, or elaboration beyond what the transcripts say.
7. Use bullet points when listing multiple points.

You also have the ability to act as an interactive AI tutor. Support these modes:

- EXPLAIN MODE: If the user asks to explain, simplify, or summarize the module, provide a clear explanation using bullet points, citing transcript sources.
- KEY TAKEAWAYS: If the user asks for key takeaways or main points, return 3-5 concise bullet points from the transcript content.
- QUIZ MODE: If the user asks to be quizzed or tested, generate 2-3 short questions based strictly on transcript content. Do not provide the answers — wait for the user to respond.
- REAL-WORLD EXAMPLES: If the user asks for examples or applications, use only examples that appear in the transcripts. Do not invent examples.

All modes must cite which submodule the content came from.
"""


def _resolve_submodule_names(requested_names: List[str]) -> List[str]:
    """Fuzzy-match requested submodule names against the embedded map."""
    available = list(embedded_chunks_map.keys())
    resolved = []
    for requested in requested_names:
        req_lower = requested.lower().strip()
        if requested in embedded_chunks_map:
            resolved.append(requested)
            continue
        matched = next((a for a in available if a.lower().strip() == req_lower), None)
        if not matched:
            matched = next(
                (a for a in available if req_lower in a.lower() or a.lower() in req_lower),
                None
            )
        resolved.append(matched or requested)
    return resolved


def _build_hellen_context_and_sources(
    data: HellenChatRequest,
    resolved_names: List[str]
) -> tuple:
    """
    Retrieve relevant chunks and build (context_str, sources, relevant_chunks).
    Returns (None, None, None) when similarity is too low.
    """
    relevant_chunks, max_score = retrieve_relevant_chunks(
        query=data.message,
        submodule_names=resolved_names,
        embedded_chunks_map=embedded_chunks_map,
        top_k=5,
        min_score=0.1
    )

    if not relevant_chunks:
        return None, None, None

    context_parts = []
    sources_seen: set = set()
    sources: List[HellenSourceOut] = []

    for chunk in relevant_chunks:
        context_parts.append(
            f"[Submodule: {chunk['submodule']} | Timestamp: {chunk['timestamp']}]\n{chunk['text']}"
        )
        source_key = (chunk["submodule"], chunk["timestamp"])
        if source_key not in sources_seen:
            sources_seen.add(source_key)
            raw = chunk["text"].replace("\n", " ").strip()
            snippet = raw[:200] + "..." if len(raw) > 200 else raw
            sources.append(HellenSourceOut(
                submodule=chunk["submodule"],
                timestamp=chunk["timestamp"],
                snippet=snippet
            ))

    context = "\n\n---\n\n".join(context_parts)
    return context, sources, relevant_chunks


def _build_openai_messages(data: HellenChatRequest, context: str) -> List[Dict]:
    """Build the messages array for OpenAI including conversation history."""
    system_prompt = HELLEN_TUTOR_SYSTEM_PROMPT.strip().replace("{module_name}", data.module_name)
    system_prompt = f"You are helping with the module: '{data.module_name}'.\n\n" + system_prompt

    user_prompt = f"""Transcript excerpts from the '{data.module_name}' module:\n\n{context}\n\n---\n\nUser request: {data.message}"""

    history = data.history or []
    recent_history = history[-6:] if len(history) > 6 else history

    messages: List[Dict] = [{"role": "system", "content": system_prompt}]
    for h in recent_history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": user_prompt})
    return messages


# ----------------------------
# Hellen+ Chat Endpoint (non-streaming, backward compatible)
# ----------------------------

@app.post("/hellen-chat", response_model=HellenChatResponse)
def hellen_chat(data: HellenChatRequest):
    """Module-specific AI tutor using semantic transcript retrieval."""

    resolved_names = _resolve_submodule_names(data.submodule_names)
    context, sources, _ = _build_hellen_context_and_sources(data, resolved_names)

    if context is None:
        return HellenChatResponse(
            response="This topic is not covered in this module.",
            sources=[]
        )

    messages = _build_openai_messages(data, context)

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    openai_url = f"{azure_endpoint}/deployments/{deployment}/chat/completions?api-version={api_version}"

    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }
    body = {"messages": messages, "temperature": 0, "max_tokens": 1000}

    try:
        response = http_requests.post(openai_url, headers=headers, json=body, timeout=30)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Azure OpenAI error: {response.status_code}")
        ai_response = response.json()["choices"][0]["message"]["content"]
        return HellenChatResponse(response=ai_response, sources=sources)
    except http_requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hellen+ error: {str(e)}")


# ----------------------------
# Hellen+ Streaming Endpoint
# ----------------------------

from fastapi.responses import StreamingResponse as FastAPIStreamingResponse
import time as _time


@app.post("/hellen-chat-stream")
def hellen_chat_stream(data: HellenChatRequest):
    """
    Streaming version of /hellen-chat.
    Emits Server-Sent Events:
      data: {"type": "sources", "sources": [...]}   <- sent first
      data: {"type": "token", "content": "..."}     <- one per token
      data: {"type": "done"}                        <- stream complete
      data: {"type": "no_content"}                  <- when nothing found
      data: {"type": "error", "detail": "..."}      <- on error
    """
    resolved_names = _resolve_submodule_names(data.submodule_names)
    context, sources, _ = _build_hellen_context_and_sources(data, resolved_names)

    if context is None:
        def no_content():
            yield f"data: {json.dumps({'type': 'no_content'})}\n\n"
        return FastAPIStreamingResponse(no_content(), media_type="text/event-stream")

    messages = _build_openai_messages(data, context)

    sources_payload = [
        {"submodule": s.submodule, "timestamp": s.timestamp, "snippet": s.snippet}
        for s in sources
    ]

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    openai_url = f"{azure_endpoint}/deployments/{deployment}/chat/completions?api-version={api_version}"

    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }
    body = {
        "messages": messages,
        "temperature": 0,
        "max_tokens": 1000,
        "stream": True
    }

    def event_stream():
        # 1. Send sources first so the frontend can display them immediately
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources_payload})}\n\n"

        try:
            with http_requests.post(
                openai_url,
                headers=headers,
                json=body,
                stream=True,
                timeout=60
            ) as resp:
                if resp.status_code != 200:
                    yield f"data: {json.dumps({'type': 'error', 'detail': f'Azure OpenAI error {resp.status_code}'})}\n\n"
                    return

                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:]  # strip "data: "
                    if payload.strip() == "[DONE]":
                        break
                    try:
                        chunk_data = json.loads(payload)
                        delta = chunk_data["choices"][0].get("delta", {})
                        token = delta.get("content", "")
                        if token:
                            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return FastAPIStreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
