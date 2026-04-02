CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
    id BIGSERIAL PRIMARY KEY,
    capability_code VARCHAR(50) NOT NULL,
    level VARCHAR(10),
    content TEXT NOT NULL,
    embedding vector(1536),
    doc_type VARCHAR(30)
);

CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
    ON rag_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);