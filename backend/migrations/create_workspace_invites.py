"""
Create workspace_invites table

This migration creates the workspace_invites table for inviting non-registered users to workspaces.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import get_db

def upgrade():
    """Create workspace_invites table"""
    db = next(get_db())

    try:
        # Create workspace_invites table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS workspace_invites (
                id VARCHAR PRIMARY KEY,
                workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                email VARCHAR NOT NULL,
                role VARCHAR NOT NULL DEFAULT 'member',
                invited_by_id UUID NOT NULL REFERENCES users(id),
                token VARCHAR UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                accepted_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR NOT NULL DEFAULT 'pending'
            );
        """))

        # Create indexes
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_workspace_invites_email
            ON workspace_invites(email);
        """))

        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_workspace_invites_token
            ON workspace_invites(token);
        """))

        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id
            ON workspace_invites(workspace_id);
        """))

        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_workspace_invites_status
            ON workspace_invites(status);
        """))

        db.commit()
        print("✅ workspace_invites table created successfully")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating workspace_invites table: {e}")
        raise
    finally:
        db.close()

def downgrade():
    """Drop workspace_invites table"""
    db = next(get_db())

    try:
        db.execute(text("DROP TABLE IF EXISTS workspace_invites CASCADE;"))
        db.commit()
        print("✅ workspace_invites table dropped successfully")

    except Exception as e:
        db.rollback()
        print(f"❌ Error dropping workspace_invites table: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running workspace_invites migration...")
    upgrade()
    print("Migration completed!")
