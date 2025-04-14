// src/components/WhatsAppMessages.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Smile, Tag, Play, Square } from 'lucide-react';
import { whatsappApi, type WhatsAppContact, type WhatsAppMessage, socket } from '../lib/whatsapp';
import { supabase } from '../lib/supabase';

function WhatsAppMessages() {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadContacts();

    const messageHandler = async (message: any) => {
      console.log('New message received:', message);
      await loadContacts();
      
      if (selectedContact && message.contact.id === selectedContact.id) {
        const lastMessageTimestamp = messages[messages.length - 1]?.created_at;
        const { data: newMessages } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('contact_id', selectedContact.id)
          .gt('created_at', lastMessageTimestamp || '1970-01-01')
          .order('created_at', { ascending: true });

        if (newMessages && newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
        }
      }
    };

    socket.on('message', messageHandler);

    return () => {
      socket.off('message', messageHandler);
    };
  }, [selectedContact, messages]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  async function loadContacts() {
    try {
      const contacts = await whatsappApi.getContacts();
      setContacts(contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Erro ao carregar contatos');
    }
  }

  async function loadMessages(contactId: string) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Erro ao carregar mensagens');
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedContact) return;

    setLoading(true);
    setError(null);
    
    try {
      const status = await whatsappApi.getStatus();
      if (!status.connected) {
        throw new Error('WhatsApp não está conectado. Por favor, conecte primeiro.');
      }

      await whatsappApi.sendMessage(selectedContact.phone, inputMessage);
      await loadMessages(selectedContact.id);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleManualService = async () => {
    if (!selectedContact) return;

    try {
      const { error } = await supabase
        .from('whatsapp_contacts')
        .update({
          is_manual_service: !selectedContact.is_manual_service,
          manual_service_started_at: !selectedContact.is_manual_service ? new Date().toISOString() : null
        })
        .eq('id', selectedContact.id);

      if (error) throw error;

      const updatedContact = {
        ...selectedContact,
        is_manual_service: !selectedContact.is_manual_service,
        manual_service_started_at: !selectedContact.is_manual_service ? new Date().toISOString() : null
      };
      setSelectedContact(updatedContact);

      setContacts(contacts.map(contact => 
        contact.id === selectedContact.id ? updatedContact : contact
      ));

      const message = !selectedContact.is_manual_service
        ? "Um atendente irá continuar o atendimento. Aguarde um momento."
        : "Obrigado pelo contato! O atendimento foi finalizado. Em que mais posso ajudar?";

      await whatsappApi.sendMessage(selectedContact.phone, message);
      await loadMessages(selectedContact.id);
    } catch (error) {
      console.error('Erro ao alterar modo de atendimento:', error);
      setError('Erro ao alterar modo de atendimento');
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  return (
    <div className="h-[calc(100vh-2rem)] bg-white rounded-lg shadow-sm flex">
      <div className="w-80 border-r">
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id} 
              className={`p-4 hover:bg-gray-50 cursor-pointer border-b ${selectedContact?.id === contact.id ? 'bg-blue-50' : ''}`}
              onClick={() => setSelectedContact(contact)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {contact.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(contact.last_message_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.is_manual_service && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded-full">
                        Atendimento Manual
                      </span>
                    )}
                    {contact.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {selectedContact.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="font-medium text-gray-900">{selectedContact.name}</h2>
                  <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleToggleManualService}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    selectedContact.is_manual_service
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {selectedContact.is_manual_service ? (
                    <>
                      <Square size={20} />
                      <span>Finalizar Atendimento</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      <span>Iniciar Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-lg p-3 max-w-[70%] ${
                      message.sender_type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span className={`text-xs mt-1 block ${
                      message.sender_type === 'user' 
                        ? 'text-blue-100' 
                        : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Smile size={20} className="text-gray-600" />
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={loading || !inputMessage.trim()}
                  className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full disabled:opacity-50"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppMessages;
