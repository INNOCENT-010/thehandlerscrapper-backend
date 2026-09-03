import os
from pathlib import Path
from dotenv import load_dotenv


# Load the worker's environment file explicitly.
# config.py is inside worker/app/, so go one directory up to worker/.
WORKER_DIR = Path(__file__).resolve().parent.parent

env_local = WORKER_DIR / ".env.local"
env_file = WORKER_DIR / ".env"

if env_local.exists():
    load_dotenv(env_local, override=True)
elif env_file.exists():
    load_dotenv(env_file, override=True)


class Settings:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()

    supabase_key = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY",
        ""
    ).strip()

    google_key = os.getenv(
        "GOOGLE_MAPS_API_KEY",
        ""
    ).strip()

    user_agent = os.getenv(
        "CRAWL_USER_AGENT",
        "TheHandlerLeadEngine/1.0"
    )

    max_pages = int(
        os.getenv(
            "CRAWL_MAX_PAGES_PER_SCHOOL",
            "8"
        )
    )

    delay_ms = int(
        os.getenv(
            "CRAWL_DELAY_MS",
            "750"
        )
    )


settings = Settings()