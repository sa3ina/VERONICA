# storage.py

import sqlite3
import datetime
import config

def init_db():
    """
    Proqram ilk işə düşəndə cədvəli yarat.
    Əgər artıq varsa, toxunma.
    """
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            ts      TEXT,       -- vaxt: "2024-01-15T08:30:00"
            count   INTEGER,    -- neçə nəfər
            percent REAL,       -- faiz: 50.3
            level   TEXT        -- "Az" / "Orta" / "Çox sıx"
        )
    """)
    conn.commit()
    conn.close()

def save(density_result):
    """
    Bir ölçməni bazaya yaz.
    density_result → density.calculate()-dən gələn dict
    """
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        "INSERT INTO readings (ts, count, percent, level) VALUES (?,?,?,?)",
        (
            datetime.datetime.now().isoformat(),
            density_result["count"],
            density_result["percent"],
            density_result["level"],
        )
    )
    conn.commit()
    conn.close()

def last_records(n=20):
    """
    Son n ölçməni qaytar (dashboard üçün)
    """
    conn = sqlite3.connect(config.DB_PATH)
    rows = conn.execute(
        "SELECT ts, count, percent, level FROM readings ORDER BY id DESC LIMIT ?",
        (n,)
    ).fetchall()
    conn.close()

    return [
        {"ts": r[0], "count": r[1], "percent": r[2], "level": r[3]}
        for r in rows
    ]