import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_5_2():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]

    print("Logging in users...")
    admin_token = login_staff("admin@crm.test")
    anita_token = login_staff("anita@crm.test")
    priya_token = login_customer("priya@shop.test")
    
    # 1. Admin creates an announcement
    print("Admin creating announcement...")
    res = client.post("/announcements", json={"title": "Hello", "content": "Welcome!"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201, res.text
    a_id = res.json()["id"]

    # 2. LEAD tries to post -> 403
    print("Anita tries to create announcement...")
    res = client.post("/announcements", json={"title": "Fake", "content": "Fake!"}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 403, "LEAD was able to post announcement!"

    # 3. Any staff gets announcements
    print("Anita reads announcements...")
    res = client.get("/announcements", headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, res.text
    ann = res.json()
    assert len(ann) >= 1
    assert ann[0]["id"] == a_id

    # 4. Customer tries to read -> 401 (or 403)
    print("Priya tries to read announcements...")
    res = client.get("/announcements", headers={"Authorization": f"Bearer {priya_token}"})
    assert res.status_code in [401, 403], f"Customer could read announcements! status: {res.status_code}"
    
    # Admin edits
    print("Admin edits announcement...")
    res = client.put(f"/announcements/{a_id}", json={"content": "Updated"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, res.text
    assert res.json()["content"] == "Updated"

    # Admin deletes
    print("Admin deletes announcement...")
    res = client.delete(f"/announcements/{a_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 204, res.text

    print("ALL 5.2 TESTS PASSED!")

if __name__ == "__main__":
    test_task_5_2()
