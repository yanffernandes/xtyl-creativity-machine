"""
Migration Script: Enable RLS Policies
Feature: 007-hybrid-supabase-architecture
Date: 2025-12-04

Applies Row Level Security policies to allow frontend direct access to Supabase.

Usage:
    cd backend
    python migrations/run_rls_migration.py
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from sqlalchemy import text


def main():
    """Execute RLS migration"""
    print("=" * 70)
    print("🔒 RLS Policies Migration - Feature 007")
    print("=" * 70)

    # Read migration file
    migration_file = os.path.join(os.path.dirname(__file__), '020_enable_rls_policies.sql')

    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    db = next(get_db())

    try:
        print("\n🚀 Applying RLS policies...")
        print("   - Enabling RLS on tables")
        print("   - Creating helper functions")
        print("   - Creating indexes")
        print("   - Creating policies")

        # Execute migration
        db.execute(text(sql))
        db.commit()

        print("\n✅ RLS policies applied successfully!")

        # Verification
        print("\n🔍 Verification:")
        result = db.execute(text("""
            SELECT tablename, COUNT(*) as policy_count
            FROM pg_policies
            WHERE schemaname = 'public'
            GROUP BY tablename
            ORDER BY tablename
        """)).fetchall()

        for row in result:
            print(f"   {row[0]}: {row[1]} policies")

        print("\n" + "=" * 70)
        print("✨ Migration Completed Successfully!")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
