import asyncio,re
from urllib.parse import urljoin,urlparse
import httpx
from bs4 import BeautifulSoup
from .config import settings

EMAIL_RE=re.compile(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}',re.I)
PHONE_RE=re.compile(r'(?:\+?234|0)[\s().-]*\d[\d\s().-]{7,}\d')
KEYWORDS=['contact','about','admission','admissions','staff','management','principal','proprietor','director','fees']

def same_domain(a,b): return urlparse(a).netloc==urlparse(b).netloc

async def crawl(start_url:str):
    if not start_url: return {'emails':[],'phones':[],'pages':[],'people':[]}
    if not start_url.startswith('http'): start_url='https://'+start_url
    queue=[start_url]; seen=set(); emails=set(); phones=set(); people=[]; pages=[]
    headers={'User-Agent':settings.user_agent}
    async with httpx.AsyncClient(timeout=15,headers=headers,follow_redirects=True) as client:
        while queue and len(pages)<settings.max_pages:
            url=queue.pop(0)
            if url in seen: continue
            seen.add(url)
            try:
                r=await client.get(url)
                if 'text/html' not in r.headers.get('content-type',''): continue
                soup=BeautifulSoup(r.text,'lxml')
                text=' '.join(soup.stripped_strings)
                emails.update(EMAIL_RE.findall(text))
                phones.update(PHONE_RE.findall(text))
                pages.append({'url':str(r.url),'title':soup.title.string.strip() if soup.title and soup.title.string else None,'text':text[:30000]})
                for a in soup.find_all('a',href=True):
                    href=urljoin(str(r.url),a['href']).split('#')[0]
                    label=(a.get_text(' ',strip=True)+' '+href).lower()
                    if same_domain(str(r.url),href) and any(k in label for k in KEYWORDS) and href not in seen:
                        queue.append(href)
                await asyncio.sleep(settings.delay_ms/1000)
            except Exception:
                continue
    return {'emails':sorted(emails),'phones':sorted(phones),'pages':pages,'people':people}
