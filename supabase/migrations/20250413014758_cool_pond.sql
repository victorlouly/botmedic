/*
  # Adicionar coluna contact_id na tabela whatsapp_messages

  1. Alterações
    - Adicionar coluna contact_id como chave estrangeira referenciando a tabela whatsapp_contacts
    - Adicionar constraint NOT NULL para garantir que toda mensagem tenha um contato associado
    
  2. Segurança
    - Manter as políticas RLS existentes
*/

-- Adicionar coluna contact_id
ALTER TABLE whatsapp_messages 
ADD COLUMN contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id);

-- Criar índice para melhorar performance de consultas
CREATE INDEX idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);