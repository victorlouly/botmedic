/*
  # Criar tabela de contatos do WhatsApp

  1. Nova Tabela
    - `whatsapp_contacts`
      - `id` (uuid, chave primária)
      - `name` (nome do contato)
      - `phone` (número do telefone)
      - `tags` (array de tags)
      - `created_at` (data de criação)
      - `last_message_at` (data da última mensagem)
      
  2. Segurança
    - Habilitar RLS
    - Adicionar políticas para usuários autenticados
*/

-- Criar tabela de contatos
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ler contatos"
  ON whatsapp_contacts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir contatos"
  ON whatsapp_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar contatos"
  ON whatsapp_contacts
  FOR UPDATE
  TO authenticated
  USING (true);