from supabase import create_client
from .config import settings

def db():
    if not settings.supabase_url or not settings.supabase_key: raise RuntimeError('Supabase environment is not configured')
    return create_client(settings.supabase_url, settings.supabase_key)
