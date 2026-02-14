"""
One-time migration: Export action request comments from Supabase → Cloud SQL.

Source: rhwb_action_requests.comments (where comments IS NOT NULL)
Maps runner_email_id and requestor_email_id → runner_ids via runners_profile.
Falls back to rhwb_coaches.fs_email_id → runners_profile for unmapped requestors.
Upserts into Cloud SQL action_comments table.

Prerequisites:
  pip install supabase psycopg2-binary

Environment variables:
  SUPABASE_URL          - Supabase project URL
  SUPABASE_SERVICE_KEY  - Supabase service role key (bypasses RLS)
  CLOUD_SQL_HOST        - Cloud SQL host (or Unix socket path)
  CLOUD_SQL_DATABASE    - Database name
  CLOUD_SQL_USER        - Database user
  CLOUD_SQL_PASSWORD    - Database password
"""

import os
import sys
from supabase import create_client
import psycopg2
from psycopg2.extras import execute_values

# --- Configuration ---
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

CLOUD_SQL_HOST = os.environ["CLOUD_SQL_HOST"]
CLOUD_SQL_DATABASE = os.environ["CLOUD_SQL_DATABASE"]
CLOUD_SQL_USER = os.environ["CLOUD_SQL_USER"]
CLOUD_SQL_PASSWORD = os.environ["CLOUD_SQL_PASSWORD"]

BATCH_SIZE = 500


def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_cloud_sql_conn():
    return psycopg2.connect(
        host=CLOUD_SQL_HOST,
        database=CLOUD_SQL_DATABASE,
        user=CLOUD_SQL_USER,
        password=CLOUD_SQL_PASSWORD,
    )


def fetch_all_paginated(sb, table, select, filters=None):
    """Fetch all rows using pagination (Supabase caps at 1000 per request)."""
    rows = []
    offset = 0
    page_size = 1000
    while True:
        query = sb.table(table).select(select).range(offset, offset + page_size - 1)
        if filters:
            for col, op, val in filters:
                query = query.filter(col, op, val)
        result = query.execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def fetch_runner_id_map(sb):
    """Build email_id → runner_id lookup from runners_profile."""
    rows = fetch_all_paginated(sb, "runners_profile", "email_id, runner_id")
    mapping = {r["email_id"]: r["runner_id"] for r in rows if r.get("runner_id")}
    print(f"  Loaded {len(mapping)} runner_id mappings from runners_profile")
    return mapping


def fetch_coach_fs_email_map(sb):
    """Build email_id → fs_email_id lookup from rhwb_coaches for fallback requestor mapping."""
    rows = fetch_all_paginated(sb, "rhwb_coaches", "email_id, fs_email_id")
    mapping = {r["email_id"]: r["fs_email_id"] for r in rows if r.get("fs_email_id")}
    print(f"  Loaded {len(mapping)} fs_email_id mappings from rhwb_coaches")
    return mapping


def fetch_action_requests_with_comments(sb):
    """Fetch all action requests that have non-null comments."""
    rows = fetch_all_paginated(
        sb,
        "rhwb_action_requests",
        "id, runner_email_id, requestor_email_id, season, comments, action_type, created_at",
        filters=[("comments", "not.is", "null")],
    )
    # Filter out empty strings
    rows = [r for r in rows if r.get("comments") and r["comments"].strip()]
    print(f"  Fetched {len(rows)} action requests with comments")
    return rows


def upsert_to_cloud_sql(conn, records):
    """Upsert records into Cloud SQL action_comments table."""
    if not records:
        print("  No records to upsert.")
        return 0

    cursor = conn.cursor()
    sql = """
        INSERT INTO action_comments (action_request_id, runner_id, requestor_id, season, comment, action_type, source_table)
        VALUES %s
        ON CONFLICT (action_request_id)
        DO UPDATE SET
            comment      = EXCLUDED.comment,
            action_type  = EXCLUDED.action_type,
            source_table = EXCLUDED.source_table,
            updated_at   = NOW()
    """
    total = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        values = [
            (
                r["action_request_id"],
                r["runner_id"],
                r["requestor_id"],
                r["season"],
                r["comment"],
                r["action_type"],
                r["source_table"],
            )
            for r in batch
        ]
        execute_values(cursor, sql, values)
        total += len(batch)
        print(f"  Upserted {total}/{len(records)} records...")

    conn.commit()
    cursor.close()
    return total


def main():
    print("=== Action Comments Migration: Supabase → Cloud SQL ===\n")

    # 1. Connect to Supabase
    print("1. Connecting to Supabase...")
    sb = get_supabase_client()

    # 2. Build runner_id map and coach fs_email fallback map
    print("2. Loading runner_id mappings...")
    runner_map = fetch_runner_id_map(sb)
    print("   Loading coach fs_email_id fallback mappings...")
    coach_fs_map = fetch_coach_fs_email_map(sb)

    # 3. Fetch action requests with comments
    print("3. Fetching action requests with comments...")
    action_rows = fetch_action_requests_with_comments(sb)

    # 4. Map email_ids → runner_ids and build upsert records
    print("4. Mapping email_ids → runner_ids...")
    records = []
    unmapped_runners = set()
    unmapped_requestors = set()

    for row in action_rows:
        runner_email = row.get("runner_email_id", "")
        requestor_email = row.get("requestor_email_id", "")

        runner_id = runner_map.get(runner_email)
        requestor_id = runner_map.get(requestor_email)

        # Fallback: if requestor not in runners_profile, look up their
        # fs_email_id from rhwb_coaches and resolve that instead.
        if not requestor_id:
            fs_email = coach_fs_map.get(requestor_email)
            if fs_email:
                requestor_id = runner_map.get(fs_email)

        if not runner_id:
            unmapped_runners.add(runner_email)
            continue
        if not requestor_id:
            unmapped_requestors.add(requestor_email)
            continue

        records.append(
            {
                "action_request_id": row["id"],
                "runner_id": runner_id,
                "requestor_id": requestor_id,
                "season": row.get("season", ""),
                "comment": row["comments"],
                "action_type": row.get("action_type", ""),
                "source_table": "rhwb_action_requests",
            }
        )

    print(f"  Prepared {len(records)} records for upsert")
    if unmapped_runners:
        print(f"  WARNING: {len(unmapped_runners)} runner email(s) had no runner_id mapping:")
        for e in sorted(unmapped_runners):
            print(f"    - {e}")
    if unmapped_requestors:
        print(f"  WARNING: {len(unmapped_requestors)} requestor email(s) had no runner_id mapping:")
        for e in sorted(unmapped_requestors):
            print(f"    - {e}")

    # 5. Upsert into Cloud SQL
    print("5. Connecting to Cloud SQL and upserting...")
    conn = get_cloud_sql_conn()
    try:
        total = upsert_to_cloud_sql(conn, records)
        print(f"\n  Successfully upserted {total} records into Cloud SQL.")
    finally:
        conn.close()

    # 6. Verify
    print("\n6. Verification summary:")
    print(f"  Action requests with comments fetched: {len(action_rows)}")
    print(f"  Records upserted to Cloud SQL:         {total}")
    print(f"  Unmapped runner emails (skipped):      {len(unmapped_runners)}")
    print(f"  Unmapped requestor emails (skipped):   {len(unmapped_requestors)}")

    if total == len(records):
        print("\n  Migration completed successfully.")
    else:
        print("\n  WARNING: Upsert count does not match prepared records.")
        sys.exit(1)


if __name__ == "__main__":
    main()
