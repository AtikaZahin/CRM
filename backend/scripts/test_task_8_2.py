import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_8_2():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Staff login failed: {res.text}"
        return res.json()["access_token"]

    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        assert res.status_code == 200, f"Customer login failed: {res.text}"
        return res.json()["access_token"]

    print("Logging in users for Task 8.2 test...")
    priya_token = login_customer("priya@shop.test")
    anita_token = login_staff("anita@crm.test")   # LEAD
    ravi_token = login_staff("ravi@crm.test")     # EMPLOYEE under Anita
    arjun_token = login_staff("arjun@crm.test")   # EMPLOYEE under Vikram
    admin_token = login_staff("admin@crm.test")   # ADMIN

    priya_headers = {"Authorization": f"Bearer {priya_token}"}
    ravi_headers = {"Authorization": f"Bearer {ravi_token}"}
    arjun_headers = {"Authorization": f"Bearer {arjun_token}"}
    anita_headers = {"Authorization": f"Bearer {anita_token}"}

    # 1. Priya books an order
    print("1. Priya creates an order...")
    res = client.get("/products")
    product_id = res.json()[0]["id"]

    res = client.post("/orders", json={"product_id": product_id, "quantity": 1}, headers=priya_headers)
    assert res.status_code == 200, res.text
    order_id = res.json()["id"]
    assert res.json()["status"] == "PLACED"

    # 2. Priya opens a ticket for this order
    print("2. Priya opens a ticket for order...")
    res = client.post("/customer/tickets", json={
        "order_id": order_id,
        "subject": "Task 8.2 Order Ticket",
        "message": "Need help with my order"
    }, headers=priya_headers)
    assert res.status_code == 200, res.text
    ticket_id = res.json()["id"]

    # 3. Anita assigns ticket to Ravi
    print("3. Anita assigns ticket to Ravi...")
    res = client.get("/staff/me", headers=ravi_headers)
    ravi_id = res.json()["id"]

    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers=anita_headers)
    assert res.status_code == 200, res.text

    # 4. Arjun (no access to Priya's ticket/order) tries to move her order to SHIPPED -> 404
    print("4. Arjun attempts to update order status (should get 404)...")
    res = client.patch(f"/orders/{order_id}/status", json={"status": "SHIPPED"}, headers=arjun_headers)
    assert res.status_code == 404, f"Arjun was able to access order: {res.status_code}"

    # 5. Ravi (assigned employee with write access) moves her order to SHIPPED -> 200
    print("5. Ravi moves order to SHIPPED...")
    res = client.patch(f"/orders/{order_id}/status", json={"status": "SHIPPED"}, headers=ravi_headers)
    assert res.status_code == 200, f"Ravi failed to update order: {res.text}"
    assert res.json()["status"] == "SHIPPED"

    # 6. Priya tries to cancel order now that it's SHIPPED -> 400
    print("6. Priya tries to cancel SHIPPED order (should get 400)...")
    res = client.post(f"/orders/{order_id}/cancel", headers=priya_headers)
    assert res.status_code == 400, f"Priya cancelled SHIPPED order: {res.status_code}"

    # 7. Invalid transition SHIPPED -> PLACED -> 400
    print("7. Ravi tries invalid transition SHIPPED -> PLACED (should get 400)...")
    res = client.patch(f"/orders/{order_id}/status", json={"status": "PLACED"}, headers=ravi_headers)
    assert res.status_code == 400, f"Allowed transition SHIPPED -> PLACED: {res.status_code}"

    # 8. Ravi moves SHIPPED -> DELIVERED -> 200
    print("8. Ravi moves order to DELIVERED...")
    res = client.patch(f"/orders/{order_id}/status", json={"status": "DELIVERED"}, headers=ravi_headers)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "DELIVERED"

    # 9. Test customer cancellation on a new PLACED order
    print("9. Testing customer cancellation on a PLACED order...")
    res = client.post("/orders", json={"product_id": product_id, "quantity": 1}, headers=priya_headers)
    new_order_id = res.json()["id"]

    res = client.post(f"/orders/{new_order_id}/cancel", headers=priya_headers)
    assert res.status_code == 200, f"Failed to cancel PLACED order: {res.text}"
    assert res.json()["status"] == "CANCELLED"

    print("ALL TASK 8.2 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_task_8_2()
