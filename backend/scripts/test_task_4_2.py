import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_websocket():
    def login_staff(email: str):
        res = client.post("/staff/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]
        
    def login_customer(email: str):
        res = client.post("/customer/login", json={"email": email, "password": "Password@123"})
        return res.json()["access_token"]

    print("Logging in users...")
    priya_token = login_customer("priya@shop.test")
    ravi_token = login_staff("ravi@crm.test")
    meena_token = login_staff("meena@crm.test")
    anita_token = login_staff("anita@crm.test")

    # Get Priya's order
    res = client.get("/orders/me", headers={"Authorization": f"Bearer {priya_token}"})
    orders = res.json()
    priya_order_id = orders[0]["id"]
    
    # 1. Priya opens a ticket
    print("Priya opens a ticket...")
    res = client.post("/customer/tickets", json={
        "order_id": priya_order_id,
        "subject": "WS Test Issue",
        "message": "My order is delayed."
    }, headers={"Authorization": f"Bearer {priya_token}"})
    ticket_id = res.json()["id"]

    # Anita assigns it to Ravi
    res = client.get("/staff/me", headers={"Authorization": f"Bearer {ravi_token}"})
    ravi_id = res.json()["id"]
    client.post(f"/tickets/{ticket_id}/assign", json={"employee_id": ravi_id}, headers={"Authorization": f"Bearer {anita_token}"})

    print(f"Testing WS connection on ticket_id: {ticket_id}")
    
    meena_ws_url = f"/ws/tickets/{ticket_id}?token={meena_token}"
    priya_ws_url = f"/ws/tickets/{ticket_id}?token={priya_token}"
    ravi_ws_url = f"/ws/tickets/{ticket_id}?token={ravi_token}"

    print("Checking if Meena is rejected...")
    try:
        with client.websocket_connect(meena_ws_url) as websocket:
            pass
        print("ERROR: Meena was able to connect!")
        sys.exit(1)
    except Exception as e:
        # Starlette raises WebSocketDisconnect on server rejection
        print(f"Meena correctly rejected: {e}")

    print("Connecting Priya and Ravi...")
    with client.websocket_connect(priya_ws_url) as priya_ws:
        with client.websocket_connect(ravi_ws_url) as ravi_ws:
            
            print("Priya sends a message...")
            priya_ws.send_text("Hello Ravi")
            
            # Priya should receive broadcast of her own message
            msg1 = priya_ws.receive_json()
            print("Priya received:", msg1)
            assert msg1["content"] == "Hello Ravi", "Content mismatch"

            # Ravi should receive it
            msg2 = ravi_ws.receive_json()
            print("Ravi received:", msg2)
            assert msg2["content"] == "Hello Ravi", "Content mismatch"
            
            print("Ravi sends a message...")
            ravi_ws.send_text("Hi Priya, looking into it")
            
            # Ravi receives own
            msg3 = ravi_ws.receive_json()
            print("Ravi received:", msg3)
            assert msg3["content"] == "Hi Priya, looking into it", "Content mismatch"

            # Priya receives Ravi's
            msg4 = priya_ws.receive_json()
            print("Priya received:", msg4)
            assert msg4["content"] == "Hi Priya, looking into it", "Content mismatch"
            
    print("ALL WS TESTS PASSED!")

if __name__ == "__main__":
    test_websocket()
