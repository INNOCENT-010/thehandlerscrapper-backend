from app.scoring import score_school

def test_basic_score():
    score,priority,signals=score_school({'website_uri':'https://school.test','national_phone_number':'0800'}, {'emails':['info@school.test'],'pages':[{'text':'principal admissions online registration'}]})
    assert score>=50
    assert priority in {'medium','high','priority'}
