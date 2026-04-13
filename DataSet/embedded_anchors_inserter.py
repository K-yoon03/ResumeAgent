import json
import psycopg2
from pgvector.psycopg2 import register_vector

INPUT_FILE = "capability_onet_anchors_embedded_v4.json"

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "resumeagent",
    "user":     "sa",
    "password": "password"
}

def run():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        documents = json.load(f)

    conn = psycopg2.connect(**DB_CONFIG)
    register_vector(conn)
    cur = conn.cursor()

    inserted = 0
    skipped  = 0

    for doc in documents:
        ref_id    = doc["ref_id"]
        content   = doc["content"]
        embedding = doc["embedding"]
        metadata  = doc.get("metadata", {})

        # 중복 방지
        cur.execute(
            "SELECT id FROM capability_anchors WHERE capability_code = %s",
            (ref_id,)
        )
        if cur.fetchone():
            print(f"  SKIP: {ref_id}")
            skipped += 1
            continue

        cur.execute(
            """
            INSERT INTO capability_anchors 
                (capability_code, content, embedding, description, 
                essential_threshold, anchors, onet_reference_elements)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (capability_code) DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                description = EXCLUDED.description,
                essential_threshold = EXCLUDED.essential_threshold,
                anchors = EXCLUDED.anchors,
                onet_reference_elements = EXCLUDED.onet_reference_elements
            """,
            (
                ref_id,
                content,
                embedding,
                metadata.get("description"),
                metadata.get("essential_threshold"),
                json.dumps(metadata.get("anchors", {}), ensure_ascii=False),
                json.dumps(metadata.get("onet_reference_elements", []), ensure_ascii=False),
            )
        )
        print(f"  INSERT: {ref_id}")
        inserted += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n완료 — 삽입: {inserted}건 / 스킵: {skipped}건")

if __name__ == "__main__":
    run()