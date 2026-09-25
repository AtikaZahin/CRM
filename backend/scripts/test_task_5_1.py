import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_5_1():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    print("Logging in users...")
    admin_token = login_staff("admin@crm.test")
    anita_token = login_staff("anita@crm.test")
    ravi_token = login_staff("ravi@crm.test")
    
    # 1. Ravi's PATCH /staff/me with role changes
    print("Testing Ravi's PATCH /staff/me...")
    res = client.patch("/staff/me", json={"role": "ADMIN", "name": "Ravi Updated"}, headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 200, res.text
    ravi = res.json()
    assert ravi["name"] == "Ravi Updated", "Name was not updated"
    assert ravi.get("role", "EMPLOYEE") == "EMPLOYEE", f"Role was changed! {ravi}"

    # 2. Anita's GET /staff shows herself, Ravi, and Meena, with team_count = 2
    print("Testing Anita's GET /staff...")
    res = client.get("/staff", headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, res.text
    staff = res.json()
    names = [s["name"] for s in staff if s["name"] is not None]
    
    print(f"Anita sees: {names}")
    # It should contain Anita, Ravi Updated, Meena
    assert any("Anita" in n for n in names), "Anita not found"
    assert any("Ravi" in n for n in names), "Ravi not found"
    assert any("Meena" in n for n in names), "Meena not found"
    
    anita_obj = next(s for s in staff if "Anita" in s.get("name", ""))
    assert anita_obj.get("team_count") == 2, f"Team count is wrong: {anita_obj.get('team_count')}"
    
    print("Testing DELETE /staff/{id} protections...")
    # Admin tries to delete Anita
    anita_id = anita_obj["id"]
    res = client.delete(f"/staff/{anita_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400, "Deleted LEAD with employees!"
    
    # Create ticket in progress for Ravi
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"})
    ravi_id = res.json()["id"]

    res = client.post("/customer/login", json={"email": "priya@shop.test", "password": "Password@123"})
    priya_token = res.json()["access_token"]
    
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_order_id = res.json()[0]["id"]
    
    res = client.post("/customer/tickets", json={"order_id": priya_order_id, "subject": "Test Delete", "message": "hello"}, headers={"Authorization": f"Bearer {priya_token}"})
    ticket_id = res.json()["id"]
    
    client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})
    
    # Admin tries to delete Ravi
    res = client.delete(f"/staff/{ravi_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400, "Deleted EMPLOYEE with IN_PROGRESS tickets!"
    
    print("ALL 5.1 TESTS PASSED!")

if __name__ == "__main__":
    test_task_5_1()
