import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Smile, Tag, Play, Square, Plus, X, DollarSign, Calendar } from 'lucide-react';
import { whatsappApi, type WhatsAppContact, type WhatsAppMessage, socket } from '../lib/whatsapp';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: { name: string; phone: string; }) => Promise<void>;
}

function NewContactModal({ isOpen, onClose, onSave }: NewContactModalProps) {
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(contact);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      alert('Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Novo Contato</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone (com DDD)
            </label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="11999999999"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WhatsAppMessages() {
  const location = useLocation();
  const selectedPhone = location.state?.selectedPhone;
  const searchQuery = location.state?.searchQuery;
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [processedMessages] = useState(new Set<string>());
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'suspended':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  useEffect(() => {
    loadContacts().then(() => {
      if (selectedPhone) {
        const contact = contacts.find(c => c.phone === selectedPhone);
        if (contact) {
          setSelectedContact(contact);
        }
      }
      
      if (searchQuery && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    });
  }, [selectedPhone, searchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadContacts();

    const messageHandler = async (message: any) => {
      const messageId = `${message.contact.id}-${message.timestamp}`;
      
      if (processedMessages.has(messageId)) {
        return;
      }
      
      processedMessages.add(messageId);
      await loadContacts();
      
      if (selectedContact && message.contact.id === selectedContact.id) {
        await loadMessages(selectedContact.id);
      }
    };

    socket.on('message', messageHandler);

    return () => {
      socket.off('message', messageHandler);
    };
  }, [selectedContact, processedMessages]);

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
      console.error('Erro ao carregar contatos:', error);
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
      
      const uniqueMessages = data?.filter((message, index, self) =>
        index === self.findIndex((m) => 
          m.content === message.content && 
          m.created_at === message.created_at
        )
      );

      setMessages(uniqueMessages || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
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
      console.error('Erro ao enviar mensagem:', error);
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

  const handleSaveNewContact = async (contact: { name: string; phone: string }) => {
    try {
      const cleanPhone = contact.phone.replace(/\D/g, '');
      const newContact = await whatsappApi.createContact({
        name: contact.name,
        phone: cleanPhone,
        tags: ['Novo Contato'],
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      });

      setContacts([newContact, ...contacts]);
      setSelectedContact(newContact);
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw error;
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
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <button
              onClick={() => setIsNewContactModalOpen(true)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus size={20} />
            </button>
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
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
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
                  {selectedContact.subscription_status && (
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedContact.subscription_status)}`}>
                      {selectedContact.subscription_status.toUpperCase()}
                    </span>
                  )}
                  
                  {selectedContact.next_payment_date && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar size={16} />
                      <span>Próximo: {new Date(selectedContact.next_payment_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {selectedContact.monthly_payment_value && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <DollarSign size={16} />
                      <span>Mensalidade: {formatCurrency(selectedContact.monthly_payment_value)}</span>
                    </div>
                  )}

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
                  className={`flex ${message.sender_type === 'contact' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`rounded-lg p-3 max-w-[70%] ${
                      message.sender_type === 'contact' 
                        ? 'bg-gray-100 text-gray-800' 
                        : message.sender_type === 'bot'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {message.sender_type === 'bot' && (
                      <div className="text-xs text-green-600 mb-1">Bot</div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span className={`text-xs mt-1 block ${
                      message.sender_type === 'contact' 
                        ? 'text-gray-500'
                        : message.sender_type === 'bot'
                        ? 'text-green-600'
                        : 'text-blue-100'
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
                <button 
                  className={`p-2 rounded-full ${!selectedContact?.is_manual_service ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
                  disabled={!selectedContact?.is_manual_service}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && selectedContact?.is_manual_service && handleSendMessage()}
                  placeholder={
                    selectedContact?.is_manual_service 
                      ? "Digite uma mensagem..." 
                      : "Inicie o atendimento manual para enviar mensagens"
                  }
                  disabled={!selectedContact?.is_manual_service}
                  className={`flex-1 px-4 py-2 rounded-full border ${
                    selectedContact?.is_manual_service
                      ? 'border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                />
                <button 
                  className={`p-2 rounded-full ${!selectedContact?.is_manual_service ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
                  disabled={!selectedContact?.is_manual_service}
                >
                  <Smile size={20} />
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={loading || !inputMessage.trim() || !selectedContact?.is_manual_service}
                  className={`p-2 rounded-full ${
                    !selectedContact?.is_manual_service || !inputMessage.trim() || loading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
              {!selectedContact?.is_manual_service && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Clique em "Iniciar Atendimento" para começar a enviar mensagens
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione um contato para iniciar a conversa
          </div>
        )}
      </div>

      <NewContactModal
        isOpen={isNewContactModalOpen}
        onClose={() => setIsNewContactModalOpen(false)}
        onSave={handleSaveNewContact}
      />
    </div>
  );
}

export default WhatsAppMessages;