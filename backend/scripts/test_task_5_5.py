import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_5_5():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]

    print("Logging in users...")
    admin_token = login_staff("admin@crm.test")
    priya_token = login_customer("priya@shop.test")
    
    res = client.get("/customer/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_id = res.json()["id"]

    # Create a deal without a customer
    print("Testing creating a deal without customer...")
    res = client.post("/deals/", json={
        "title": "Deal No Customer",
        "value": 1000.0,
        "status": "Open"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201, res.text
    assert res.json()["customer_id"] is None
    deal1_id = res.json()["id"]

    # Create a deal with a customer
    print("Testing creating a deal with a customer...")
    res = client.post("/deals/", json={
        "title": "Deal With Customer",
        "value": 5000.0,
        "status": "Open",
        "customer_id": priya_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201, res.text
    assert res.json()["customer_id"] == priya_id
    deal2_id = res.json()["id"]
    
    # Check retrieving them
    res = client.get("/deals/", headers={"Authorization": f"Bearer {admin_token}"})
    deals = res.json()
    assert any(d["id"] == deal1_id and d["customer_id"] is None for d in deals)
    assert any(d["id"] == deal2_id and d["customer_id"] == priya_id for d in deals)

    print("ALL 5.5 TESTS PASSED!")

if __name__ == "__main__":
    test_task_5_5()
