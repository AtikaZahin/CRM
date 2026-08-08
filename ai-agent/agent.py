import sys
import os
import google.generativeai as genai

# Add the parent directory to the path so we can run this file directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gemini.client import get_chat_session
from gemini.function_defs import crm_tools

# Build a dictionary of tools for easy execution
tools_dict = {tool.__name__: tool for tool in crm_tools}

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
            
            try:
                response = chat.send_message(user_input)
                
                # Loop to handle potentially multiple function calls
                while True:
                    # Check if the model wants to call functions
                    if response.function_calls:
                        for function_call in response.function_calls:
                            tool_name = function_call.name
                            args = dict(function_call.args)
                            
                            print(f"🔧 Agent wants to run: {tool_name}({args})")
                            
                            # Confirmation for destructive actions
                            if tool_name.startswith("delete_"):
                                confirm = input(f"⚠️ Are you sure you want to run {tool_name}? [y/N]: ")
                                if confirm.lower() != 'y':
                                    print("❌ Action cancelled.")
                                    function_response = {"result": "User cancelled the operation."}
                                else:
                                    if tool_name in tools_dict:
                                        try:
                                            result = tools_dict[tool_name](**args)
                                            function_response = {"result": result}
                                        except Exception as e:
                                            function_response = {"error": str(e)}
                                    else:
                                        function_response = {"error": "Tool not found."}
                            else:
                                # Non-destructive action
                                if tool_name in tools_dict:
                                    try:
                                        result = tools_dict[tool_name](**args)
                                        function_response = {"result": result}
                                    except Exception as e:
                                        function_response = {"error": str(e)}
                                else:
                                    function_response = {"error": "Tool not found."}
                                    
                            # Send the function response back to the model
                            response = chat.send_message(
                                genai.types.Part.from_function_response(
                                    name=tool_name,
                                    response=function_response
                                )
                            )
                    else:
                        # Print the AI's final response
                        print(f"\n🤖 Agent: {response.text}")
                        break
                        
                # Memory management: Trim history to last 5 interactions (10 messages + system prompt)
                # Note: history can be manipulated directly or we can just let it grow. 
                # Since manipulating history might break some SDK versions, a safe way is just slicing it.
                if len(chat.history) > 10:
                    chat.history = chat.history[-10:]
                        
            except Exception as e:
                print(f"❌ Error communicating with model: {e}")
            
    except Exception as e:
        print(f"\n❌ Initialization Error: {e}")

if __name__ == "__main__":
    main()
