-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  stripe_customer_id VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table (expedientes/demandas)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  original_filename VARCHAR NOT NULL,
  hash_original VARCHAR UNIQUE NOT NULL,
  file_size INTEGER,
  document_type VARCHAR, -- 'amparo', 'demanda', 'sentencia', etc
  status VARCHAR DEFAULT 'processing', -- 'processing', 'completed', 'error'
  error_message TEXT,
  vlm_provider VARCHAR DEFAULT 'gemini', -- 'gemini' o 'claude'
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Markdown output (resultado limpio)
CREATE TABLE IF NOT EXISTS markdown_output (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  markdown_text TEXT NOT NULL,
  word_count INTEGER,
  anomalies JSONB, -- Array de problemas detectados
  cleanup_rules_applied JSONB, -- Qué se limpió
  validation_score DECIMAL(3,2), -- 0.00 a 1.00
  created_at TIMESTAMP DEFAULT NOW()
);

-- Certificado forense (trazabilidad legal)
CREATE TABLE IF NOT EXISTS certificado_forense (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  hash_original VARCHAR NOT NULL,
  hash_markdown VARCHAR NOT NULL,
  digital_signature VARCHAR,
  signing_key_id VARCHAR,
  vlm_used VARCHAR NOT NULL,
  algorithm_version VARCHAR DEFAULT '1.0',
  processing_timestamp TIMESTAMP DEFAULT NOW(),
  validation_status VARCHAR DEFAULT 'OK', -- 'OK', 'ALERT', 'FAILED'
  integrity_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PageIndex tree structure
CREATE TABLE IF NOT EXISTS pageindex_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  tree_structure JSONB NOT NULL, -- Árbol jerárquico completo
  tree_depth INTEGER,
  total_nodes INTEGER,
  metadata JSONB, -- expediente, juzgado, autoridad, etc
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- Processing events (historial)
CREATE TABLE IF NOT EXISTS processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  event_type VARCHAR, -- 'upload', 'processing', 'validation', 'pageindex', 'completed'
  event_details JSONB,
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_markdown_output_document_id ON markdown_output(document_id);
CREATE INDEX idx_pageindex_tree_document_id ON pageindex_tree(document_id);
CREATE INDEX idx_processing_events_user_id ON processing_events(user_id);
CREATE INDEX idx_processing_events_created_at ON processing_events(created_at);