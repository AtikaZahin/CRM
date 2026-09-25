import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_5_3():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]

    print("Logging in users...")
    admin_token = login_staff("admin@crm.test")
    anita_token = login_staff("anita@crm.test")
    ravi_token = login_staff("ravi@crm.test")
    arjun_token = login_staff("arjun@crm.test")
    priya_token = login_customer("priya@shop.test")
    
    res = client.get("/customer/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_id = res.json()["id"]

    # Initially, no tickets are assigned, so Ravi should get 404 for Priya
    res = client.get(f"/customers/{priya_id}", headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 404, "Ravi saw Priya without tickets assigned"

    # Priya creates ticket
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_order_id = res.json()[0]["id"]
    
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Missing item",
        "message": "Help"
    }, headers={"Authorization": f"Bearer {priya_token}"})
    ticket_id = res.json()["id"]

    # Still 404 because unassigned
    res = client.get(f"/customers/{priya_id}", headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 404, "Ravi saw Priya with unassigned ticket"

    # Anita assigns ticket to Ravi
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"})
    ravi_id = res.json()["id"]
    
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200
    
    # Now Ravi sees Priya
    res = client.get(f"/customers/{priya_id}", headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 200, "Ravi got 404 for Priya after ticket assigned"
    priya_detail = res.json()
    assert len(priya_detail["orders"]) > 0, "Priya orders missing"
    assert len(priya_detail["tickets"]) > 0, "Priya tickets missing"
    assert priya_detail["tickets"][0]["id"] == ticket_id

    # Arjun should get 404 for Priya
    res = client.get(f"/customers/{priya_id}", headers={"Authorization": f"Bearer {arjun_token}"})
    assert res.status_code == 404, "Arjun saw Priya!"

    print("ALL 5.3 TESTS PASSED!")

if __name__ == "__main__":
    test_task_5_3()
