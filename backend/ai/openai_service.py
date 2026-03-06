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

            # Build catalog lookup (duration + rating)
            sub_lookup = {
                s["name"]: {"duration": s["duration"], "rating": s.get("rating")}
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
                        "duration": sub_lookup[name]["duration"],
                        "rating": sub_lookup[name]["rating"]
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
                        "duration": sub["duration"],
                        "rating": sub.get("rating")
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
                s["name"]: {"duration": s["duration"], "rating": s.get("rating")}
                for s in module_data["submodules"]
            }

            # 1️⃣ Add AI-ranked first
            for sub in ranked_subs:
                name = sub["submodule_name"]

                if name not in sub_lookup:
                    continue

                duration = sub_lookup[name]["duration"]
                rating = sub_lookup[name]["rating"]

                if sub_time + duration <= remaining:
                    partial_subs.append({
                        "name": name,
                        "duration": duration,
                        "rating": rating
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
                            "duration": duration,
                            "rating": catalog_sub.get("rating")
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

Your job is to analyze the user's answers and recommend the MOST relevant learning modules from the available training catalog.

You must carefully match the learning content to the user's:
- job role
- experience level
- learning goals
- interests

You must NOT simply fill available time. Your goal is relevance and impact.

----------------------------------------------------
PROFILE SUMMARY
----------------------------------------------------

First, generate a concise narrative summary of the user's profile.

The summary must:
- Be maximum 100 words.
- Be written in second person, directly addressing the user (e.g. start with "You are...").
- Describe the user's current job function, their Data/Analytics/AI proficiency level, and their learning goals.
- The Data/Analytics/AI experience level refers ONLY to their proficiency with Data, Analytics, and AI — NOT their seniority in their job function.
- Do NOT merge the job function and the experience level into a single phrase (e.g. do NOT write "advanced operations professional").
- Be suitable for display on a "Your Profile" section in a UI.
- Do NOT use third-person phrases like "The user is..." or "This user...".

The summary MUST clearly distinguish between:

1) The user's JOB FUNCTION  
   (e.g., Operations, Finance, HR, Marketing)

2) The user's EXPERIENCE LEVEL WITH DATA, ANALYTICS & AI  
   (Beginner / Intermediate / Professional / Advanced)

IMPORTANT RULE:
The experience level refers ONLY to the user's knowledge of Data, Analytics & AI.
It does NOT refer to their seniority in their job function.

For example:

CORRECT:
"You are working in Operations and have a professional-level proficiency in Data, Analytics, and AI."

INCORRECT:
"You are a professional operations specialist."

Do NOT merge the role and experience level into a single phrase.

The summary should mention:
- the user's job function
- their Data/Analytics/AI proficiency level
- their learning goals
- their available learning time if provided

Return it as:

"profile_summary": "string"

----------------------------------------------------
CRITICAL COURSE SELECTION RULES
----------------------------------------------------

You MUST strictly filter the training content.

Do NOT recommend courses just to fill time.

Only include modules that are clearly relevant to the user's goals and role.

Before including any learning path, evaluate:

1) Does this path directly improve the user's job performance?
2) Does this path support the user's stated learning goal?
3) Is this path essential (not optional) for that role?

If the answer is NOT clearly YES to at least two of these questions,
DO NOT include the learning path.

----------------------------------------------------
MAXIMUM NUMBER OF LEARNING PATHS
----------------------------------------------------

You may recommend a maximum of **3 learning paths**.

Preferred number:
- 2 learning paths is ideal.
- 3 learning paths only if all three are strongly relevant.

If fewer paths are clearly relevant, return only those.

Never include additional learning paths just to fill space.

Quality is more important than quantity.

----------------------------------------------------
EXPERIENCE LEVEL ADAPTATION
----------------------------------------------------

IMPORTANT: The experience level (beginner / intermediate / advanced) reflects the user's proficiency
in Data, Analytics & AI — NOT their seniority or years of experience in their job function.
Do NOT describe a user as e.g. "an advanced-level finance professional" — the level refers only to
their data and analytics knowledge. A user can be a senior professional in their field but a beginner
in data skills, or vice versa.

You must adapt recommendations to the user's Data, Analytics & AI experience level.

BEGINNER:
- Include foundational modules
- Prioritize basic concepts and structured learning progression

INTERMEDIATE:
- Skip very basic introductions
- Focus on practical and applied modules

ADVANCED:
- Skip beginner and introductory modules
- Recommend advanced, technical, and specialized modules
- Focus on optimization, advanced analytics, modeling, or architecture
- Assume foundational knowledge already exists

Do NOT include beginner material for advanced users unless absolutely necessary.

----------------------------------------------------
PEDAGOGICAL ORDERING RULE
----------------------------------------------------

Respect learning dependencies.

Foundational knowledge must appear before advanced topics.

Example:
- Data fundamentals → Data analysis → Machine learning

Do NOT place advanced topics before required fundamentals.

----------------------------------------------------
PRIORITIZATION RULE
----------------------------------------------------

Order everything by importance.

Learning paths → most important first  
Modules → most important first  
Submodules → most important first  

Lower priority content must appear at the end.

----------------------------------------------------
MODULE REASONING
----------------------------------------------------

For each recommended module, explain WHY it was selected.

The explanation must:
- Reference the user's goals or role
- Be concise (1–2 sentences)
- Clearly explain the value of the module

Return this as:

"reasoning": "string"

----------------------------------------------------
OUTPUT FORMAT (STRICT JSON)
----------------------------------------------------

You MUST return valid JSON in exactly this format:

{
  "profile_summary": "string",

  "ranked_modules": [
    {
      "learning_path": "string",
      "module_name": "string",
      "priority_score": number,
      "reasoning": "string",

      "ranked_submodules": [
        {
          "submodule_name": "string",
          "priority_score": number
        }
      ]
    }
  ]
}

----------------------------------------------------
SCORING RULES
----------------------------------------------------

priority_score:
1–10 scale

10 = critical knowledge  
7–9 = highly valuable  
4–6 = useful but secondary  
1–3 = low importance

----------------------------------------------------
IMPORTANT CONSTRAINTS
----------------------------------------------------

- Maximum **3 learning paths total**.
- Prefer **2 learning paths when possible**.
- Do NOT include extra paths to fill time.
- Do NOT include duration values.
- It is better to return fewer highly relevant modules than many loosely relevant ones.
- If only one learning path is relevant, return only that path.
- If multiple modules belong to the same learning path, prefer selecting the most valuable modules within that path instead of introducing additional learning paths.

Return ONLY JSON.
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

        if "profile_summary" not in cleaned_json:
            raise Exception("Missing profile_summary")

        if not isinstance(cleaned_json["profile_summary"], str):
            raise Exception("Invalid profile_summary")

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

        # Store reasoning for each module so we don't lose it during greedy packing
        reasoning_lookup = {}

        for item in cleaned_json["ranked_modules"]:
            key = (item["learning_path"], item["module_name"])
            reasoning_lookup[key] = item.get("reasoning", "")

        # 🎒 Greedy selection
        selected_structure, total_time = greedy_module_selection(
            cleaned_json["ranked_modules"],
            module_catalog,
            total_minutes
        )

        print(f"Greedy packed total minutes: {total_time}/{total_minutes}")

        # Convert to final output format
        final_output = {
            "profile_summary": cleaned_json["profile_summary"],
            "selected_paths": []
        }

        for lp, modules in list(selected_structure.items())[:3]:
            final_output["selected_paths"].append({
                "learning_path": lp,
                "modules": [
                    {
                        "module_name": module_name,
                        "reasoning": reasoning_lookup.get((lp, module_name), ""),
                        "submodules": submodules
                    }
                    for module_name, submodules in modules.items()
                ]
            })

        return final_output

    except Exception as e:
        raise Exception(f"JSON Parsing Error: {e} | Raw Response: {content}")