import os
import psycopg2
from psycopg2.extras import DictCursor

def get_db_connection():
    """Create a database connection using environment variables"""
    return psycopg2.connect(
        dbname=os.environ.get('PGDATABASE'),
        user=os.environ.get('PGUSER'),
        password=os.environ.get('PGPASSWORD'),
        host=os.environ.get('PGHOST'),
        port=os.environ.get('PGPORT')
    )

def execute_sql(query, params=None, fetchall=True):
    """Execute SQL query and return results"""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    return cur.fetchall() if fetchall else cur.fetchone()
                conn.commit()
                return None
    except Exception as e:
        print(f"Database error: {e}")
        raise
