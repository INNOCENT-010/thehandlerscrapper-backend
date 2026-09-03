"""Import Nigeria's state/LGA hierarchy from open-admin-data into Supabase.

Source: https://openadmindata.org/ng (CC-BY-4.0)
Run after the initial migration and state seed.
"""
import os, requests
from supabase import create_client

BASE='https://openadmindata.org/api/ng'
sb=create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

def slug(s):
    return ''.join(c.lower() if c.isalnum() else '-' for c in s).strip('-')

states=requests.get(f'{BASE}/states',timeout=30).json()
country=sb.table('locations').select('id').eq('type','country').eq('slug','nigeria').single().execute().data
for st in states:
    name=st.get('name',{}).get('en') or st.get('name')
    row=sb.table('locations').upsert({'parent_id':country['id'],'name':name,'slug':slug(name),'type':'state','country_code':'NG','latitude':float(st['geo']['lat']) if st.get('geo') else None,'longitude':float(st['geo']['lon']) if st.get('geo') else None},on_conflict='parent_id,slug,type').execute().data[0]
    state_id=row['id']
    lgas=requests.get(f"{BASE}/states/{slug(name)}/lgas",timeout=30).json()
    for lga in lgas:
        lname=lga.get('name',{}).get('en') or lga.get('name')
        sb.table('locations').upsert({'parent_id':state_id,'name':lname,'slug':slug(lname),'type':'lga','country_code':'NG','latitude':float(lga['geo']['lat']) if lga.get('geo') else None,'longitude':float(lga['geo']['lon']) if lga.get('geo') else None},on_conflict='parent_id,slug,type').execute()
print('Imported Nigerian state/LGA hierarchy.')
