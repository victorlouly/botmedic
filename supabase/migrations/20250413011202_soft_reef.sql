/*
  # Criar tabela de mensagens do WhatsApp

  1. Nova Tabela
    - `whatsapp_messages`
      - `id` (uuid, chave primária)
      - `content` (texto da mensagem)
      - `sender_type` (tipo do remetente: user, contact, bot)
      - `sender_id` (id do remetente)
      - `department` (departamento selecionado)
      - `tags` (array de tags)
      - `created_at` (data de criação)
      
  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar política para usuários autenticados
    
  3. Função para Limpeza
    - Criar função para limpar mensagens antigas
*/

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'contact', 'bot')),
  sender_id TEXT,
  department TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ler mensagens"
  ON whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir mensagens"
  ON whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Função para limpar mensagens antigas (mais de 7 dias)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM whatsapp_messages
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Agendar limpeza diária
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_old_messages();
END;
$$;

SELECT cron.schedule(
  'cleanup-messages',
  '0 0 * * *', -- Executar todo dia à meia-noite
  'SELECT schedule_cleanup()'
);