import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_8_1():
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Login failed: {res.text}"
        return res.json()["access_token"]

    print("Logging in customer...")
    priya_token = login_customer("priya@shop.test")
    headers = {"Authorization": f"Bearer {priya_token}"}

    # 1. OrderCreate quantity validation
    print("Testing POST /orders quantity limits (0, -5, 1000)...")
    res = client.get("/products")
    product_id = res.json()[0]["id"]

    for invalid_qty in [0, -5, 1000]:
        res = client.post("/orders", json={"product_id": product_id, "quantity": invalid_qty}, headers=headers)
        assert res.status_code == 422, f"Allowed invalid quantity {invalid_qty}: {res.status_code}"

    # Valid quantity 1 and 10 should succeed
    res = client.post("/orders", json={"product_id": product_id, "quantity": 2}, headers=headers)
    assert res.status_code == 200, f"Failed valid order quantity 2: {res.text}"

    # 2. Customer register validation
    print("Testing customer registration validation...")
    # Name over 80 chars
    res = client.post("/customer/register", json={"name": "A" * 81, "email": "test81@shop.test", "password": "Password@123"})
    assert res.status_code == 422, "Allowed name > 80 chars"

    # Password under 8 chars
    res = client.post("/customer/register", json={"name": "Test User", "email": "test81@shop.test", "password": "123"})
    assert res.status_code == 422, "Allowed password < 8 chars"

    # Phone over 20 chars
    res = client.post("/customer/register", json={"name": "Test User", "email": "test81@shop.test", "password": "Password@123", "phone": "1" * 21})
    assert res.status_code == 422, "Allowed phone > 20 chars"

    # 3. Empty / whitespace message validation over REST
    print("Testing REST chat message validation...")
    # Get Priya's order to open a ticket
    res = client.get("/orders/me", headers=headers)
    priya_order_id = res.json()[0]["id"]

    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Task 8.1 Ticket",
        "message": "Valid first message"
    }, headers=headers)
    assert res.status_code == 200, f"Failed to create ticket: {res.text}"
    ticket_id = res.json()["id"]

    # Post whitespace-only message over REST
    for invalid_msg in ["", "   ", "\n\t  "]:
        res = client.post(f"/tickets/{ticket_id}/messages", json={"content": invalid_msg}, headers=headers)
        assert res.status_code == 422, f"Allowed whitespace/empty message over REST: {invalid_msg}"

    print("ALL TASK 8.1 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_task_8_1()
