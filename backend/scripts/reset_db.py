import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def main():
    if os.environ.get("ALLOW_DB_RESET") != "true":
        print("Refusal: ALLOW_DB_RESET is not set to true. Aborting database reset.")
        sys.exit(1)

    print("Resetting database...")
    from app.database.connection import engine
    from app.database.base import Base
    
    # Import all models to ensure they are registered
    from app.models.user import User
    from app.models.deal import Deal
    
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset complete.")

if __name__ == "__main__":
    main()
