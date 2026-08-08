import os
import sys

# Add parent directory to path to import gemini
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gemini.function_defs import add_lead, get_deals, delete_lead
import json

def run_tests():
    print("Running Tests for AI Agent Tools...")
    print("-" * 40)
    
    # 6.2 Test: Add lead Rahul from Infosys
    print("Test 6.2: Add lead Rahul from Infosys")
    result = add_lead(
        name="Rahul Sharma",
        company="Infosys",
        email="rahul.sharma@infosys.com",
        phone="9876543210"
    )
    print("Result:", result)
    assert "Success" in result, f"Failed to add lead: {result}"
    
    # 6.3 Test: Show deals in negotiation
    print("\nTest 6.3: Show deals in negotiation")
    deals_result = get_deals(stage="negotiation")
    print("Result:", deals_result)
    assert "Error" not in deals_result, f"Failed to get deals: {deals_result}"
    
    # Test deleting a lead
    if "ID:" in result:
        lead_id = int(result.split("ID:")[1].strip())
        print(f"\nTest 6.6 related: Deleting the created lead with ID {lead_id}")
        delete_result = delete_lead(id=lead_id)
        print("Result:", delete_result)
        assert "Success" in delete_result, f"Failed to delete lead: {delete_result}"
    
    print("\nAll backend tool tests passed successfully!")

if __name__ == "__main__":
    run_tests()
