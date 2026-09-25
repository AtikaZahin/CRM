import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_reassignment():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        return res.json()["access_token"]

    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        return res.json()["access_token"]

    print("Logging in users...")
    priya_token = login_customer("priya@shop.test")
    anita_token = login_staff("anita@crm.test")   # LEAD 1 (has Ravi & Meena)
    ravi_token = login_staff("ravi@crm.test")     # EMPLOYEE under Anita
    meena_token = login_staff("meena@crm.test")   # EMPLOYEE under Anita
    admin_token = login_staff("admin@crm.test")   # ADMIN

    # Get employee IDs
    ravi_id = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"}).json()["id"]
    meena_id = client.get("/staff/me", headers={"Authorization": f"Bearer {meena_token}"}).json()["id"]

    # 1. Priya opens a ticket
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_order_id = res.json()[0]["id"]
    
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Reassignment Test Ticket",
        "message": "Testing reassigning ticket from one employee to another"
    }, headers={"Authorization": f"Bearer {priya_token}"})
    assert res.status_code == 200
    ticket_id = res.json()["id"]

    # 2. Anita assigns ticket to Ravi
    print("1. Anita assigns ticket to Ravi...")
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, f"Failed initial assignment: {res.text}"

    # Verify assigned to Ravi
    res = client.get("/tickets?status=IN_PROGRESS", headers={"Authorization": f"Bearer {anita_token}"})
    ticket_data = next(t for t in res.json() if t["id"] == ticket_id)
    assert ticket_data["assigned_employee_id"] == ravi_id

    # 3. Anita REASSIGNS ticket from Ravi to Meena
    print("2. Anita re-assigns ticket from Ravi to Meena...")
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": meena_id}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, f"Reassignment by LEAD failed: {res.text}"

    # Verify assigned to Meena
    res = client.get("/tickets?status=IN_PROGRESS", headers={"Authorization": f"Bearer {anita_token}"})
    ticket_data = next(t for t in res.json() if t["id"] == ticket_id)
    assert ticket_data["assigned_employee_id"] == meena_id

    # 4. Admin REASSIGNS ticket back to Ravi
    print("3. Admin re-assigns ticket back to Ravi...")
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, f"Reassignment by ADMIN failed: {res.text}"

    # Verify assigned to Ravi again
    res = client.get("/tickets?status=IN_PROGRESS", headers={"Authorization": f"Bearer {admin_token}"})
    ticket_data = next(t for t in res.json() if t["id"] == ticket_id)
    assert ticket_data["assigned_employee_id"] == ravi_id

    print("ALL REASSIGNMENT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_reassignment()
