import sqlite3

def check():
    conn = sqlite3.connect("smartcity_ai.db")
    cursor = conn.cursor()

    try:
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        ).fetchall()

        print("Tables:", tables)

        for table in tables:
            name = table[0]

            count = cursor.execute(
                f"SELECT COUNT(*) FROM {name};"
            ).fetchone()[0]

            print(f"Table {name} has {count} rows")

            if name == "users":
                rows = cursor.execute(
                    "SELECT id, username, email, role, is_active FROM users;"
                ).fetchall()

                print("\nUsers:")
                for row in rows:
                    print(row)

    except Exception as e:
        print("Database Error:", e)

    finally:
        conn.close()

if __name__ == "__main__":
    check()