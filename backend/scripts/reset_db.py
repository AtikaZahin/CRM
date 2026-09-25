import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Ensure the app module can be imported when running as: python -m scripts.reset_db
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main() -> None:
    if os.environ.get("ALLOW_DB_RESET") != "true":
        print("Refusal: ALLOW_DB_RESET is not set to true. Aborting database reset.")
        sys.exit(1)

    print("Resetting database...")
    from sqlalchemy import text
    from app.database.connection import engine
    from app.database.base import Base

    # Import all models so their tables are registered in Base.metadata.
    from app.models.user import User  # noqa: F401
    from app.models.deal import Deal  # noqa: F401
    from app.models.product import Product  # noqa: F401
    from app.models.customer import Customer  # noqa: F401
    from app.models.order import Order  # noqa: F401
    from app.models.ticket import Ticket, Message  # noqa: F401
    from app.models.announcement import Announcement  # noqa: F401

    # Drop the entire public schema with CASCADE to remove orphan tables
    # (e.g. notes, tasks) that SQLAlchemy no longer manages.
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()

    # Recreate only the tables that are currently in the models.
    Base.metadata.create_all(bind=engine)
    print("Database reset complete.")


if __name__ == "__main__":
    main()
