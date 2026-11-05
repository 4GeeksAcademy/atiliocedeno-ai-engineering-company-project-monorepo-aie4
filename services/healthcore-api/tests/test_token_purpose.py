"""Token purpose boundaries, including sessions issued before purpose existed."""
from datetime import datetime, timedelta, timezone
import secrets
from types import SimpleNamespace
import jwt
import pytest
from fastapi.testclient import TestClient
from app.core import security
from app.api import deps
from app.main import app


@pytest.fixture
def signing_key(monkeypatch):
    key = secrets.token_urlsafe(48)
    monkeypatch.setattr(security, '_JWT_SECRET', key)
    return key


def test_access_and_reset_have_separate_purposes(signing_key):
    access = security.create_access_token('1')
    reset = security.create_password_reset_token('1', 'test-id', datetime.now(timezone.utc) + timedelta(minutes=5))
    assert security.decode_access_token(access)['purpose'] == 'access'
    assert security.decode_password_reset_token(reset)['purpose'] == 'password_reset'
    with pytest.raises(jwt.InvalidTokenError): security.decode_access_token(reset)
    with pytest.raises(jwt.InvalidTokenError): security.decode_password_reset_token(access)


@pytest.mark.parametrize('kind', ['legacy', 'access', 'password_reset', 'unknown', 'null', 'expired', 'tampered'])
def test_protected_endpoints_enforce_access_purpose(signing_key, monkeypatch, kind):
    claims = {'sub': '1', 'exp': datetime.now(timezone.utc) + timedelta(minutes=5)}
    if kind != 'legacy': claims['purpose'] = None if kind == 'null' else kind
    if kind in ('expired', 'tampered'): claims['purpose'] = 'access'
    if kind == 'expired': claims['exp'] = datetime.now(timezone.utc) - timedelta(seconds=1)
    key = secrets.token_urlsafe(48) if kind == 'tampered' else signing_key
    token = jwt.encode(claims, key, algorithm='HS256')
    user = SimpleNamespace(id=1, is_active=True, email='test@example.com', role='user')
    service = SimpleNamespace(get_user=lambda _: user, get_profile=lambda _: None)
    monkeypatch.setattr(deps, 'get_user_service', lambda: service)
    app.dependency_overrides[deps.get_user_service] = lambda: service
    try:
        with TestClient(app) as client:
            headers = {'Authorization': f'Bearer {token}'}
            allowed = kind in ('legacy', 'access')
            assert client.get('/auth/me', headers=headers).status_code == (200 if allowed else 401)
            assert client.get('/profiles/me', headers=headers).status_code == (404 if allowed else 401)
    finally:
        app.dependency_overrides.pop(deps.get_user_service, None)


@pytest.mark.parametrize('kind', ['expired', 'tampered', 'legacy', 'access'])
def test_reset_decoder_rejects_invalid_tokens(signing_key, kind):
    claims = {'sub': '1', 'jti': 'test-id', 'purpose': 'password_reset', 'exp': datetime.now(timezone.utc) + timedelta(minutes=5)}
    if kind == 'expired': claims['exp'] = datetime.now(timezone.utc) - timedelta(seconds=1)
    if kind == 'legacy': claims.pop('purpose')
    if kind == 'access': claims['purpose'] = 'access'
    token = jwt.encode(claims, secrets.token_urlsafe(48) if kind == 'tampered' else signing_key, algorithm='HS256')
    with pytest.raises(jwt.InvalidTokenError): security.decode_password_reset_token(token)
