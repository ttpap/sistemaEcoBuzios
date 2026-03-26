-- Configurações de certificados por projeto
CREATE TABLE certificate_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text_template text NOT NULL DEFAULT '',
  border_color text NOT NULL DEFAULT '#C9A84C',
  border_style text NOT NULL DEFAULT 'solid',
  logo_top text,
  logo_bottom text,
  signatures_count int NOT NULL DEFAULT 4 CHECK (signatures_count BETWEEN 1 AND 5),
  signatures jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- RLS
ALTER TABLE certificate_configs ENABLE ROW LEVEL SECURITY;

-- Admin autenticado tem acesso total
CREATE POLICY "Admin full access on certificate_configs"
  ON certificate_configs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Leitura anônima (para coordenadores em Modo B)
CREATE POLICY "Anon read certificate_configs"
  ON certificate_configs
  FOR SELECT
  TO anon
  USING (true);

-- Escrita anônima (coordenadores Modo B precisam salvar configurações)
CREATE POLICY "Anon write certificate_configs"
  ON certificate_configs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
