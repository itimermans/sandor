from fastapi.testclient import TestClient
from sandor_backend.api.app import app


def test_health_endpoint():
    client = TestClient(app)
    res = client.get("/health/")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") == "ok"
    assert "service" in body
