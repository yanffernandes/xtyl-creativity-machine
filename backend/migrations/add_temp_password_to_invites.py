"""
Add temp_password column to workspace_invites table
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import get_db

def upgrade():
    """Add temp_password column"""
    db = next(get_db())

    try:
        db.execute(text("""
            ALTER TABLE workspace_invites
            ADD COLUMN IF NOT EXISTS temp_password VARCHAR;
        """))

        db.commit()
        print("✅ temp_password column added to workspace_invites table")

    except Exception as e:
        db.rollback()
        print(f"❌ Error adding temp_password column: {e}")
        raise
    finally:
        db.close()

def downgrade():
    """Remove temp_password column"""
    db = next(get_db())

    try:
        db.execute(text("""
            ALTER TABLE workspace_invites
            DROP COLUMN IF EXISTS temp_password;
        """))

        db.commit()
        print("✅ temp_password column removed from workspace_invites table")

    except Exception as e:
        db.rollback()
        print(f"❌ Error removing temp_password column: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running temp_password migration...")
    upgrade()
    print("Migration completed!")
