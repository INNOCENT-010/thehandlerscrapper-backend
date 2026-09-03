def score_school(school:dict, crawl:dict)->tuple[int,str,list[dict]]:
    score=25; signals=[]
    def add(points,code,detail):
        nonlocal score
        score+=points; signals.append({'code':code,'points':points,'detail':detail})
    if school.get('website_uri'): add(10,'WEBSITE','Public school website found')
    if crawl.get('emails'): add(12,'PUBLIC_EMAIL','Public business email found')
    if school.get('national_phone_number') or school.get('international_phone_number'): add(8,'PHONE','Phone number available')
    text=' '.join(p.get('text','').lower() for p in crawl.get('pages',[]))
    if any(x in text for x in ['online registration','admission portal','apply online']): add(8,'ONLINE_REGISTRATION','Online registration/admission signal')
    if any(x in text for x in ['school management','student management','school software','portal']): add(4,'SOFTWARE_SIGNAL','Existing digital-management signal detected')
    if any(x in text for x in ['proprietor','proprietress','principal','director','administrator']): add(8,'DECISION_MAKER_SIGNAL','Decision-maker language found on public pages')
    score=min(100,score)
    priority='priority' if score>=90 else 'high' if score>=75 else 'medium' if score>=50 else 'low'
    return score,priority,signals
