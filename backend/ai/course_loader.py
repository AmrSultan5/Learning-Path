import pandas as pd
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_PATH = os.path.join(
    BASE_DIR,
    "data",
    "DIAI Academy eLearning details(Sheet1).csv"
)


def parse_rating(feedback_text):
    """Extract numeric rating from user_feedback strings like '4 learners, rating 5.0, ...'"""
    if not feedback_text or pd.isna(feedback_text):
        return None
    feedback_str = str(feedback_text)
    if "No detailed feedback" in feedback_str:
        return None
    match = re.search(r'rating\s+([\d.]+)', feedback_str)
    if match:
        return float(match.group(1))
    return None


def load_courses():
    df = pd.read_csv(CSV_PATH)

    grouped_paths = {}

    for _, row in df.iterrows():
        # A row can contain multiple learning paths separated by comma
        learning_paths = [lp.strip() for lp in str(row["learning_path"]).split(",")]

        module_name = row["module"]
        submodule_name = row["sub_module"]
        duration = int(row["duration_in_minutes"])
        rating = parse_rating(row.get("user_feedback", ""))

        for lp in learning_paths:

            if lp not in grouped_paths:
                grouped_paths[lp] = {}

            if module_name not in grouped_paths[lp]:
                grouped_paths[lp][module_name] = []

            grouped_paths[lp][module_name].append({
                "name": submodule_name,
                "duration": duration,
                "rating": rating
            })

    # Convert dictionary to nested structure
    structured_courses = []

    for lp, modules in grouped_paths.items():
        structured_courses.append({
            "learning_path": lp,
            "modules": [
                {
                    "module_name": module_name,
                    "submodules": submodules
                }
                for module_name, submodules in modules.items()
            ]
        })

    return structured_courses