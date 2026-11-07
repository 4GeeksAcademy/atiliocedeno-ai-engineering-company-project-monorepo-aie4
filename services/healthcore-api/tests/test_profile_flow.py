"""Session, profile ownership and phone-validation regressions."""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.profile import normalize_phone


@pytest.mark.parametrize("raw,expected", [
    (None,None),("",None),("   ",None),("+1 (202) 555-0123","+12025550123"),
    ("202-555-0123","+12025550123"),("+44 20 7946 0018","+442079460018"),
    ("020 7946 0018","+442079460018"),("07400 123456","+447400123456"),
])
def test_valid_phones(raw,expected):
    assert normalize_phone(raw)==expected


@pytest.mark.parametrize("value", ["efefefef", "202abc5550123", "+1 202 555 0123 ext 1", "123", "+44 123", "++12025550123", "+12025550123("])
def test_invalid_phones(value):
    with pytest.raises(ValueError): normalize_phone(value)


def test_normal_user_can_create_and_update_own_profile_without_losing_session():
    with TestClient(app) as client:
        email=f"profile-{uuid.uuid4().hex}@example.com"
        password="SyntheticPassword123!"
        registered=client.post('/users',json={'email':email,'password':password})
        assert registered.status_code==201
        token=client.post('/auth/login',json={'email':email,'password':password}).json()['access_token']
        headers={'Authorization':f'Bearer {token}'}
        assert client.get('/auth/me',headers=headers).json()['profile'] is None
        assert client.get('/profiles/me',headers=headers).status_code==404
        for phone in ['letters','202abc5550123']:
            response=client.post('/profiles/me',headers=headers,json={'name':'Synthetic User','phone':phone})
            assert response.status_code==422
            assert client.get('/auth/me',headers=headers).status_code==200
        created=client.post('/profiles/me',headers=headers,json={'name':'Synthetic User','phone':'+44 20 7946 0018'})
        assert created.status_code==201
        assert created.json()['user_id']==registered.json()['id']
        assert created.json()['phone']=='+442079460018'
        assert client.get('/auth/me',headers=headers).json()['profile']['name']=='Synthetic User'
        assert client.put('/profiles/me',headers=headers,json={'phone':'202-555-0123'}).json()['phone']=='+12025550123'
        assert client.put('/profiles/me',headers=headers,json={'phone':'letters'}).status_code==422
        assert client.get('/profiles/me',headers=headers).json()['phone']=='+12025550123'
        assert client.post('/profiles/999999',headers=headers,json={}).status_code==403
        assert client.post('/profiles/me',headers=headers,json={'user_id':999999}).status_code==422
        assert client.get('/auth/me',headers=headers).status_code==200
        assert client.get('/profiles/me').status_code==401
        assert client.get('/profiles/me',headers={'Authorization':'Bearer expired'}).status_code==401


def test_signup_cannot_bypass_phone_validation():
    with TestClient(app) as client:
        response=client.post('/users',json={'email':'invalid-phone@example.com','password':'SyntheticPassword123!','profile':{'phone':'abc123'}})
        assert response.status_code==422
