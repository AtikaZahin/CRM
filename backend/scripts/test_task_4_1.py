import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal

client = TestClient(app)

def main():
    # 1. Login to get tokens
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]

    print("Logging in users...")
    priya_token = login_customer("priya@shop.test")
    anita_token = login_staff("anita@crm.test") # LEAD
    vikram_token = login_staff("vikram@crm.test") # LEAD
    ravi_token = login_staff("ravi@crm.test") # EMPLOYEE under anita
    arjun_token = login_staff("arjun@crm.test") # EMPLOYEE under vikram
    meena_token = login_staff("meena@crm.test") # EMPLOYEE under anita
    admin_token = login_staff("admin@crm.test") # ADMIN

    # Get Priya's order
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    orders = res.json()
    priya_order_id = orders[0]["id"]
    
    # 1. Priya opens a ticket on her order.
    print("1. Priya opens a ticket")
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Missing item",
        "message": "My order is missing the keyboard."
    }, headers={"Authorization": f"Bearer {priya_token}"})
    assert res.status_code == 200, res.text
    ticket_id = res.json()["id"]

    # 2. Anita and Vikram both see it as unassigned. Ravi does not see it.
    print("2. Anita and Vikram see it, Ravi doesn't")
    res = client.get("/tickets?unassigned=true", headers={"Authorization": f"Bearer {anita_token}"})
    assert any(t["id"] == ticket_id for t in res.json()), "Anita couldn't see unassigned ticket"
    
    res = client.get("/tickets?unassigned=true", headers={"Authorization": f"Bearer {vikram_token}"})
    assert any(t["id"] == ticket_id for t in res.json()), "Vikram couldn't see unassigned ticket"

    res = client.get("/tickets", headers={"Authorization": f"Bearer {ravi_token}"})
    assert not any(t["id"] == ticket_id for t in res.json()), "Ravi saw unassigned ticket"

    # Get Ravi's ID
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"})
    ravi_id = res.json()["id"]
    
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {arjun_token}"})
    arjun_id = res.json()["id"]

    # 3. Anita assigns it to Ravi → success.
    print("3. Anita assigns to Ravi")
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 200, res.text

    # 4. Vikram then tries to assign it to Arjun → fails (already assigned).
    print("4. Vikram tries to assign to Arjun")
    res = client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": arjun_id}, headers={"Authorization": f"Bearer {vikram_token}"})
    assert res.status_code == 400, "Vikram succeeded in assigning an already assigned ticket!"

    # 5. Anita trying to assign one of Vikram's employees → fails.
    # To test this, we need another unassigned ticket.
    print("5. Anita tries to assign Vikram's employee")
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "Another issue",
        "message": "Help"
    }, headers={"Authorization": f"Bearer {priya_token}"})
    ticket2_id = res.json()["id"]
    
    res = client.post(f"/tickets/{ticket2_id}/assign", json={"employee_id": arjun_id}, headers={"Authorization": f"Bearer {anita_token}"})
    assert res.status_code == 400, "Anita assigned Vikram's employee!"

    # 6. Ravi and Priya can post messages. Meena gets 404. Admin can read but posting fails.
    print("6. Testing message access")
    # Priya posts
    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "Please hurry"}, headers={"Authorization": f"Bearer {priya_token}"})
    assert res.status_code == 200, res.text
    # Ravi posts
    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "Looking into it"}, headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 200, res.text
    # Meena posts -> 404
    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "Intruding"}, headers={"Authorization": f"Bearer {meena_token}"})
    assert res.status_code == 404, "Meena could post!"
    # Admin reads -> OK
    res = client.get(f"/tickets/{ticket_id}/messages", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, res.text
    # Admin posts -> 404
    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "Admin override"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 404, "Admin could post!"

    # 7. After Ravi resolves it, nobody can post.
    print("7. Testing resolved ticket")
    res = client.post(f"/tickets/{ticket_id}/resolve", headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 200, res.text

    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "Wait"}, headers={"Authorization": f"Bearer {priya_token}"})
    assert res.status_code == 400, "Priya could post to resolved ticket!"
    
    res = client.post(f"/tickets/{ticket_id}/messages", json={"content": "One more thing"}, headers={"Authorization": f"Bearer {ravi_token}"})
    assert res.status_code == 400, "Ravi could post to resolved ticket!"

    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    main()
