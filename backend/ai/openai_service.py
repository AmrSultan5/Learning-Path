import requests
import os
import json
from dotenv import load_dotenv
from ai.course_loader import load_courses

load_dotenv()

API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")

OPENAI_ENDPOINT = f"{AZURE_ENDPOINT}/deployments/{DEPLOYMENT}/chat/completions?api-version={API_VERSION}"


"""
def clean_json_response(content: str):
    '''
    Removes markdown code fences and safely parses JSON.
    '''

    # Remove markdown ```json ``` if present
    if "```" in content:
        parts = content.split("```")
        # Usually JSON is inside the second part
        if len(parts) > 1:
            content = parts[1]

        # Remove leading 'json'
        if content.strip().startswith("json"):
            content = content.strip()[4:]

    content = content.strip()

    # Parse to ensure valid JSON
    parsed = json.loads(content)

    return parsed
"""

def greedy_module_selection(ranked_modules, module_catalog, max_minutes):
    """
    Select full modules first by priority.
    Then fill remaining time with submodules if needed.
    """

    # Sort modules by priority descending
    ranked_modules.sort(
        key=lambda x: x["priority_score"],
        reverse=True
    )

    selected_structure = {}
    total_time = 0

    for item in ranked_modules:
        key = (item["learning_path"], item["module_name"])

        if key not in module_catalog:
            continue

        module_data = module_catalog[key]
        module_duration = module_data["duration"]

        # If full module fits
        if total_time + module_duration <= max_minutes:
            # Sort submodules by AI priority
            ranked_subs = sorted(
                item["ranked_submodules"],
                key=lambda x: x["priority_score"],
                reverse=True
            )

            # Build catalog lookup
            sub_lookup = {
                s["name"]: s["duration"]
                for s in module_data["submodules"]
            }

            ordered_subs = []
            ranked_names = set()

            # Add AI-ranked submodules first
            for sub in ranked_subs:
                name = sub["submodule_name"]
                if name in sub_lookup:
                    ordered_subs.append({
                        "name": name,
                        "duration": sub_lookup[name]
                    })
                    ranked_names.add(name)

            # 🔁 Fallback: append unranked submodules at lowest priority
            missing_subs = []

            for catalog_sub in module_data["submodules"]:
                if catalog_sub["name"] not in ranked_names:
                    missing_subs.append(catalog_sub)

            if missing_subs:
                print(
                    f"[WARNING] AI missed {len(missing_subs)} submodules in module "
                    f"{key[1]} under {key[0]}. Appending at lowest priority."
                )

                for sub in missing_subs:
                    ordered_subs.append({
                        "name": sub["name"],
                        "duration": sub["duration"]
                    })

            if not ordered_subs:
                continue

            selected_structure.setdefault(key[0], {})
            selected_structure[key[0]][key[1]] = ordered_subs

            total_time += sum(sub["duration"] for sub in ordered_subs)

        # If module doesn't fully fit → try partial submodules
        else:
            remaining = max_minutes - total_time
            if remaining <= 0:
                break

            partial_subs = []
            sub_time = 0

            ranked_subs = sorted(
                item["ranked_submodules"],
                key=lambda x: x["priority_score"],
                reverse=True
            )

            sub_lookup = {
                s["name"]: s["duration"]
                for s in module_data["submodules"]
            }

            # 1️⃣ Add AI-ranked first
            for sub in ranked_subs:
                name = sub["submodule_name"]

                if name not in sub_lookup:
                    continue

                duration = sub_lookup[name]

                if sub_time + duration <= remaining:
                    partial_subs.append({
                        "name": name,
                        "duration": duration
                    })
                    sub_time += duration

            # 2️⃣ Fallback for missing submodules
            ranked_names = {sub["name"] for sub in partial_subs}

            for catalog_sub in module_data["submodules"]:
                if catalog_sub["name"] not in ranked_names:
                    duration = catalog_sub["duration"]

                    if sub_time + duration <= remaining:
                        partial_subs.append({
                            "name": catalog_sub["name"],
                            "duration": duration
                        })
                        sub_time += duration

            # 3️⃣ Commit AFTER fallback
            if partial_subs:
                selected_structure.setdefault(key[0], {})
                selected_structure[key[0]][key[1]] = partial_subs
                total_time += sub_time

            break

    return selected_structure, total_time


def generate_learning_recommendation(user_answers: str, time_available: str):

    courses = load_courses()

    # Build module duration lookup
    module_catalog = {}

    for path in courses:
        lp_name = path["learning_path"]
        for module in path["modules"]:
            module_name = module["module_name"]
            total_duration = sum(sub["duration"] for sub in module["submodules"])

            module_catalog[(lp_name, module_name)] = {
                "duration": total_duration,
                "submodules": module["submodules"]
            }

    # Convert "20 hours" → 20 → 1200 minutes
    total_hours = int(time_available.split()[0])
    total_minutes = total_hours * 60

    # 1️⃣ SYSTEM PROMPT: Static rules and schema (Standard string, no f-string curly brace errors!)
    system_prompt = """
You are an AI career learning advisor.
Your task is to select the most suitable learning paths and organize them clearly by modules and submodules.

VERY IMPORTANT PRIORITY RULE:
- Order learning paths from MOST important to LEAST important.
- Inside each learning path, order modules from MOST important to LEAST important.
- Inside each module, order submodules from MOST important to LEAST important.
- The most important content MUST appear first.
- The least important content MUST appear last.
- Lower priority content should be placed at the end because it may be removed if time exceeds the limit.

PEDAGOGICAL ORDERING RULE:

- Respect learning dependencies.
- Foundational modules must come before advanced modules.
- If a module depends on fundamental knowledge, include fundamentals first.
- Introductory or foundational modules must appear before applied or advanced modules.
- Do NOT place advanced visualization or modeling before basic data concepts.

CRITICAL RELEVANCE RULE:
- Only include learning paths that are strongly relevant to the user's job function, experience level, and goals.
- If a learning path is not clearly relevant, DO NOT include it.
- Do NOT include all available learning paths just because time is available.
- Exclude weakly related or generic content.
- It is better to return fewer highly relevant modules than many loosely related ones.
- You must be selective.
- Only return modules that directly support the user's stated goals or role.
- If only one learning path is relevant, return only that path.
- Do NOT fill time just because time is available.
- If two learning paths contain identical foundational modules, include the foundational module only once and avoid redundancy.

STRICT RELEVANCE FILTER:

- Before including a learning path, explicitly evaluate:
  1) Does this path directly improve the user's stated job function?
  2) Does this path directly support the user's primary learning goal?
  3) Would this path be considered essential (not optional) for that role?

- If the answer is not clearly YES to at least two of the above, DO NOT include the path.

- Do not include advanced AI or machine learning paths unless the user explicitly states interest in AI, ML, or data science roles.

- Marketing, business, and MBA-oriented users should prioritize business intelligence, data storytelling, analytics, and decision-focused modules.

You MUST return JSON in EXACTLY this format:
{
  "ranked_modules": [
    {
      "learning_path": "string",
      "module_name": "string",
      "priority_score": number,
      "ranked_submodules": [
        {
          "submodule_name": "string",
          "priority_score": number
        }
      ]
    }
  ]
}

Rules:
- Rank modules by importance (1–10).
- Inside each module, rank submodules by importance (1–10).
- Higher priority_score means more important.
- Do NOT include duration.
- Return ONLY valid JSON.
"""

    # 2️⃣ USER PROMPT: Dynamic data injection (f-string)
    user_prompt = f"""
{user_answers}

Available training content:
{json.dumps(courses, indent=2)}
"""

    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY
    }

    body = {
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "temperature": 0,
        "max_tokens": 4000,
        "response_format": { "type": "json_object" } # 3️⃣ Native JSON Mode enabled
    }

    print("\n================ AI INPUT DEBUG ================\n")
    print("SYSTEM PROMPT:\n")
    print(system_prompt)

    print("USER PROFILE SENT TO AI:\n", 
          repr(user_answers))

    print("\nTIME AVAILABLE:\n")
    print(time_available)

    print("\n================================================\n")

    response = requests.post(
        OPENAI_ENDPOINT,
        headers=headers,
        json=body,
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(f"OpenAI HTTP Error {response.status_code}: {response.text}")

    result = response.json()
    print("OPENAI RESPONSE:", result)

    if "choices" not in result:
        raise Exception(f"OpenAI Error: {result}")

    content = result["choices"][0]["message"]["content"]

    if not content:
        raise Exception("Empty AI response")

    try:
        # Since we are using JSON mode, the AI is forced to return JSON. 
        # We can still run it through your cleaner just to be absolutely safe.
        cleaned_json = json.loads(content)

        # Validate AI structure
        if "ranked_modules" not in cleaned_json:
            raise Exception("Invalid AI structure: missing ranked_modules")

        for item in cleaned_json["ranked_modules"]:
            if not isinstance(item.get("learning_path"), str):
                raise Exception("Invalid learning_path")
            if not isinstance(item.get("module_name"), str):
                raise Exception("Invalid module_name")
            if not isinstance(item.get("priority_score"), (int, float)):
                raise Exception("Invalid module priority_score")
            if "ranked_submodules" not in item:
                raise Exception("Missing ranked_submodules")

            for sub in item["ranked_submodules"]:
                if not isinstance(sub.get("submodule_name"), str):
                    raise Exception("Invalid submodule_name")
                if not isinstance(sub.get("priority_score"), (int, float)):
                    raise Exception("Invalid submodule priority_score")

        # 🎒 Greedy selection
        selected_structure, total_time = greedy_module_selection(
            cleaned_json["ranked_modules"],
            module_catalog,
            total_minutes
        )

        print(f"Greedy packed total minutes: {total_time}/{total_minutes}")

        # Convert to final output format
        final_output = {
            "selected_paths": []
        }

        for lp, modules in selected_structure.items():
            final_output["selected_paths"].append({
                "learning_path": lp,
                "modules": [
                    {
                        "module_name": module_name,
                        "submodules": submodules
                    }
                    for module_name, submodules in modules.items()
                ]
            })

        return final_output

    except Exception as e:
        raise Exception(f"JSON Parsing Error: {e} | Raw Response: {content}")