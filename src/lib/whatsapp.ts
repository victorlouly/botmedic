import io from 'socket.io-client';
import { supabase } from './supabase';

const WHATSAPP_SERVER_URL = 'https://ampemesonline.com.br'; // Corrigido de https para http

export const socket = io(WHATSAPP_SERVER_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  created_at: string;
  last_message_at: string;
}

export interface WhatsAppMessage {
  id: string;
  content: string;
  sender_type: 'user' | 'contact' | 'bot';
  sender_id?: string;
  contact_id: string;
  department?: string;
  tags: string[];
  created_at: string;
}

export const whatsappApi = {
  connect: async () => {
    const response = await fetch(`${WHATSAPP_SERVER_URL}/connect`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  disconnect: async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/disconnect`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao desconectar: ${response.statusText}`);
      }

      // Limpar dados locais após desconexão bem-sucedida
      await supabase.from('whatsapp_connections').delete().neq('id', '');
      
      return response.json();
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      throw error;
    }
  },

  getStatus: async () => {
    const response = await fetch(`${WHATSAPP_SERVER_URL}/status`, {
      credentials: 'include'
    });
    return response.json();
  },

  sendMessage: async (number: string, message: string) => {
    try {
      // Verificar status da conexão
      const status = await whatsappApi.getStatus();
      if (!status.connected) {
        throw new Error('WhatsApp não está conectado. Por favor, conecte primeiro.');
      }

      // Formatar número do telefone
      const formattedNumber = number.replace(/\D/g, '');
      
      // Verificar se o contato existe e criar se necessário
      let contactData;
      const { data: existingContact } = await supabase
        .from('whatsapp_contacts')
        .select()
        .eq('phone', formattedNumber)
        .single();

      if (!existingContact) {
        // Se o contato não existe, criar um novo
        const { data: newContact, error: contactError } = await supabase
          .from('whatsapp_contacts')
          .insert({
            name: formattedNumber,
            phone: formattedNumber,
            tags: ['Novo Contato']
          })
          .select()
          .single();

        if (contactError) throw contactError;
        contactData = newContact;
      } else {
        contactData = existingContact;
      }

      // Salvar mensagem no banco
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          content: message,
          sender_type: 'user',
          contact_id: contactData.id,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Enviar mensagem via WhatsApp
      const response = await fetch(`${WHATSAPP_SERVER_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          number: formattedNumber,
          message 
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.statusText}`);
      }

      // Atualizar último contato
      await supabase
        .from('whatsapp_contacts')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', contactData.id);

      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  async getContacts() {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createContact(contact: Partial<WhatsAppContact>) {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMessages(contactId: string) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async saveMessage(message: Partial<WhatsAppMessage>) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Configure socket listeners
socket.on('message', async (message) => {
  try {
    // When receiving a message, save to database
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select()
      .eq('phone', message.from.split('@')[0])
      .single();

    if (contact) {
      await whatsappApi.saveMessage({
        content: message.content,
        sender_type: 'contact',
        contact_id: contact.id,
        created_at: new Date(message.timestamp * 1000).toISOString()
      });

      // Update contact's last message timestamp
      await supabase
        .from('whatsapp_contacts')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', contact.id);
    }
  } catch (error) {
    console.error('Error processing received message:', error);
  }
});