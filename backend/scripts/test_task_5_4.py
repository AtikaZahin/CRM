import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_5_4():
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
    priya_token = login_customer("priya@shop.test")
    
    # 1. Create a ticket using Priya to have some ticket stats
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    priya_order_id = res.json()[0]["id"]
    
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Missing item",
        "message": "Help"
    }, headers={"Authorization": f"Bearer {priya_token}"})
    ticket_id = res.json()["id"]

    # 2. Assign ticket to Ravi by Anita
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"})
    ravi_id = res.json()["id"]
    client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})

    # Get Admin Dashboard
    print("Testing Admin Dashboard...")
    res = client.get("/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, res.text
    admin_stats = res.json()
    assert admin_stats["total_staff"] == 7
    assert admin_stats["total_leads"] == 2
    assert admin_stats["total_employees"] == 4
    assert admin_stats["total_customers"] == 2
    assert admin_stats["total_orders"] == 4
    assert admin_stats["tickets_by_status"]["IN_PROGRESS"] == 1
    
    # Get Anita (LEAD) Dashboard
    print("Testing LEAD Dashboard...")
    res = client.get("/dashboard", headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, res.text
    lead_stats = res.json()
    assert lead_stats["team_size"] == 2  # Ravi and Meena
    assert lead_stats["unassigned_tickets"] == 0
    assert lead_stats["tickets_by_status"]["IN_PROGRESS"] == 1
    
    # Get Ravi (EMPLOYEE) Dashboard
    print("Testing EMPLOYEE Dashboard...")
    res = client.get("/dashboard", headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 200, res.text
    emp_stats = res.json()
    assert emp_stats["tickets_by_status"]["IN_PROGRESS"] == 1

    print("ALL 5.4 TESTS PASSED!")

if __name__ == "__main__":
    test_task_5_4()
