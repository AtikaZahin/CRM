"""
Database migration helpers for edge case protections.

These migrations add database-level constraints that prevent race conditions
even when application-level checks are bypassed by concurrent requests.

Usage:
    from app.database.migrations import run_migrations
    run_migrations(engine)
"""

import logging
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def run_migrations(engine: Engine) -> None:
    """Run all database-level migrations for edge case protections."""
    _add_active_ticket_per_order_constraint(engine)
    _add_message_indexes(engine)


def _add_active_ticket_per_order_constraint(engine: Engine) -> None:
    """
    Add a partial unique index to enforce one active ticket per order at the DB level.
    
    This prevents Breakpoint #3 (concurrent ticket creation on the same order)
    even if the application-level check is bypassed by a race condition.
    
    For PostgreSQL: Uses a partial unique index with WHERE clause.
    For SQLite: Uses a trigger-based approach (SQLite doesn't support partial indexes well).
    """
    dialect = engine.dialect.name
    
    try:
        with engine.connect() as conn:
            if dialect == "postgresql":
                # Check if index already exists
                result = conn.execute(text(
                    "SELECT 1 FROM pg_indexes WHERE indexname = 'uq_active_ticket_per_order'"
                ))
                if not result.fetchone():
                    conn.execute(text(
                        "CREATE UNIQUE INDEX uq_active_ticket_per_order "
                        "ON tickets(order_id) WHERE status != 'RESOLVED'"
                    ))
                    conn.commit()
                    logger.info("Created partial unique index uq_active_ticket_per_order")
                else:
                    logger.debug("Index uq_active_ticket_per_order already exists")
                    
            elif dialect == "sqlite":
                # SQLite supports partial indexes since 3.8.0
                # Check if index exists
                result = conn.execute(text(
                    "SELECT 1 FROM sqlite_master WHERE type='index' "
                    "AND name='uq_active_ticket_per_order'"
                ))
                if not result.fetchone():
                    conn.execute(text(
                        "CREATE UNIQUE INDEX uq_active_ticket_per_order "
                        "ON tickets(order_id) WHERE status != 'RESOLVED'"
                    ))
                    conn.commit()
                    logger.info("Created partial unique index uq_active_ticket_per_order (SQLite)")
                else:
                    logger.debug("Index uq_active_ticket_per_order already exists (SQLite)")
            else:
                logger.warning(
                    "Unsupported dialect '%s' for partial unique index. "
                    "Please add the constraint manually.", dialect
                )
    except Exception as exc:
        logger.warning("Failed to create uq_active_ticket_per_order index: %s", exc)


def _add_message_indexes(engine: Engine) -> None:
    """Add performance indexes for message queries."""
    try:
        inspector = inspect(engine)
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("messages")}
        
        with engine.connect() as conn:
            if "ix_messages_ticket_created" not in existing_indexes:
                conn.execute(text(
                    "CREATE INDEX ix_messages_ticket_created "
                    "ON messages(ticket_id, created_at)"
                ))
                conn.commit()
                logger.info("Created composite index ix_messages_ticket_created")
                
            if "ix_tickets_order_status" not in existing_indexes:
                try:
                    existing_ticket_indexes = {idx["name"] for idx in inspector.get_indexes("tickets")}
                    if "ix_tickets_order_status" not in existing_ticket_indexes:
                        conn.execute(text(
                            "CREATE INDEX ix_tickets_order_status "
                            "ON tickets(order_id, status)"
                        ))
                        conn.commit()
                        logger.info("Created composite index ix_tickets_order_status")
                except Exception:
                    pass
    except Exception as exc:
        logger.warning("Failed to create message indexes: %s", exc)
