import { supabase } from './supabase';

export interface WhatsAppMessage {
  id?: string;
  content: string;
  sender_type: 'user' | 'contact' | 'bot';
  sender_id?: string;
  department?: string;
  tags?: string[];
  created_at?: string;
}

export const messagesApi = {
  async saveMessage(message: WhatsAppMessage) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([message])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  },

  async getMessages(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  },

  async getMessagesByDepartment(department: string, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar mensagens por departamento:', error);
      throw error;
    }
  }
};