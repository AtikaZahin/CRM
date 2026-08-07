import sys
import os

# Add the parent directory to the path so we can run this file directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gemini.client import get_chat_session

def main():
    print("🤖 CRM AI Agent Started!")
    print("Type your commands below (e.g., 'Add a lead named Jane Doe from Apple, jane@apple.com').")
    print("Type 'quit' or 'exit' to stop.")
    print("-" * 50)
    
    try:
        # Start a new conversation
        chat = get_chat_session()
        
        while True:
            user_input = input("\nYou: ")
            if user_input.lower() in ['quit', 'exit']:
                break
                
            if not user_input.strip():
                continue
                
            # Send the message to Gemini
            print("🤖 AI is thinking (and possibly executing tools)...")
            response = chat.send_message(user_input)
            
            # Print the AI's final response
            print(f"\n🤖 Agent: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
