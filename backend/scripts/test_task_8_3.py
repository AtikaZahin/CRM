import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_8_3():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Staff login failed: {res.text}"
        return res.json()["access_token"]

    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Customer login failed: {res.text}"
        return res.json()["access_token"]

    print("Logging in users for Task 8.3 test...")
    priya_token = login_customer("priya@shop.test")
    anita_token = login_staff("anita@crm.test")   # LEAD
    ravi_token = login_staff("ravi@crm.test")     # EMPLOYEE under Anita

    priya_headers = {"Authorization": f"Bearer {priya_token}"}
    anita_headers = {"Authorization": f"Bearer {anita_token}"}
    ravi_headers = {"Authorization": f"Bearer {ravi_token}"}

    # Get Priya's order ID
    res = client.get("/orders/me", headers=priya_headers)
    assert res.status_code == 200
    orders = res.json()
    order_id = orders[0]["id"]
    assert orders[0]["open_ticket_id"] is None

    # 1. Priya opens a ticket with category DAMAGED and blank subject
    print("1. Priya opens ticket with category DAMAGED and blank subject...")
    res = client.post("/customer/tickets", json={
        "order_id": order_id,
        "category": "DAMAGED",
        "subject": "",
        "message": "The screen has a crack"
    }, headers=priya_headers)
    assert res.status_code == 200, f"Failed ticket creation: {res.text}"
    ticket1_data = res.json()
    ticket1_id = ticket1_data["id"]
    assert ticket1_data["category"] == "DAMAGED"
    assert ticket1_data["subject"] == "Damaged item"

    # 2. GET /orders/me now includes open_ticket_id == ticket1_id
    print("2. GET /orders/me reflects open_ticket_id...")
    res = client.get("/orders/me", headers=priya_headers)
    orders = res.json()
    target_order = next(o for o in orders if o["id"] == order_id)
    assert target_order["open_ticket_id"] == ticket1_id

    # 3. Priya attempts to open a 2nd ticket on the same open order -> 409
    print("3. Priya tries to open 2nd ticket on same open order (should get 409)...")
    res = client.post("/customer/tickets", json={
        "order_id": order_id,
        "category": "LATE_DELIVERY",
        "subject": "Second Ticket Attempt",
        "message": "Another issue"
    }, headers=priya_headers)
    assert res.status_code == 409, f"Allowed 2nd ticket on open order: {res.status_code} {res.text}"

    # 4. Anita assigns ticket to Ravi & Ravi resolves ticket
    print("4. Anita assigns ticket to Ravi & Ravi resolves it...")
    ravi_id = client.get("/staff/me", headers=ravi_headers).json()["id"]
    client.post(f"/tickets/{ticket1_id}/assign", json={"employee_id": ravi_id}, headers=anita_headers)
    
    res = client.post(f"/tickets/{ticket1_id}/resolve", headers=ravi_headers)
    assert res.status_code == 200, f"Failed to resolve ticket: {res.text}"

    # 5. GET /orders/me now has open_ticket_id == None
    print("5. GET /orders/me has open_ticket_id == None after resolution...")
    res = client.get("/orders/me", headers=priya_headers)
    orders = res.json()
    target_order = next(o for o in orders if o["id"] == order_id)
    assert target_order["open_ticket_id"] is None

    # 6. Priya opens a new ticket on the resolved order -> 200 OK
    print("6. Priya opens a new ticket on the resolved order...")
    res = client.post("/customer/tickets", json={
        "order_id": order_id,
        "category": "WRONG_ITEM",
        "subject": "Replacement item is wrong",
        "message": "Received wrong color"
    }, headers=priya_headers)
    assert res.status_code == 200, f"Failed opening ticket on resolved order: {res.text}"
    assert res.json()["category"] == "WRONG_ITEM"

    print("ALL TASK 8.3 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_task_8_3()
