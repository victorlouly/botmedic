import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string;
  subscription_status: 'pending' | 'active' | 'suspended' | 'cancelled';
  subscription_start_date: string;
  last_payment_date: string;
  next_payment_date: string;
  monthly_payment_value: number;
  payment_day: number;
  medical_record: string;
  notes: string;
}

function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    subscription_status: 'pending',
    monthly_payment_value: 99.90,
    payment_day: 10
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        subscription_start_date: formData.subscription_start_date || new Date().toISOString(),
        next_payment_date: calculateNextPaymentDate(formData.payment_day || 10)
      };

      if (editingClient) {
        await supabase
          .from('whatsapp_contacts')
          .update(data)
          .eq('id', editingClient.id);
      } else {
        await supabase
          .from('whatsapp_contacts')
          .insert([data]);
      }

      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({});
      await loadClients();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente');
    }
  };

  const calculateNextPaymentDate = (paymentDay: number) => {
    const today = new Date();
    const nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    
    if (nextPayment < today) {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    }
    
    return nextPayment.toISOString();
  };

  const handleStatusChange = async (clientId: string, newStatus: Client['subscription_status']) => {
    try {
      await supabase
        .from('whatsapp_contacts')
        .update({
          subscription_status: newStatus,
          last_payment_date: newStatus === 'active' ? new Date().toISOString() : null
        })
        .eq('id', clientId);

      await loadClients();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h1>
        <button
          onClick={() => {
            setEditingClient(null);
            setFormData({});
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <select
            className="px-4 py-2 rounded-lg border border-gray-200"
            onChange={(e) => setSearchTerm(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="pending">Pendentes</option>
            <option value="suspended">Suspensos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Pagamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Mensal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-500">{client.cpf}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.phone}</div>
                  <div className="text-sm text-gray-500">{client.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.subscription_status)}`}>
                    {client.subscription_status?.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {client.next_payment_date ? new Date(client.next_payment_date).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {client.monthly_payment_value?.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(client.id, 'active')}
                      className="text-green-600 hover:text-green-900"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(client.id, 'suspended')}
                      className="text-red-600 hover:text-red-900"
                    >
                      <XCircle size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setFormData(client);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Mensal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_payment_value || ''}
                    onChange={(e) => setFormData({ ...formData, monthly_payment_value: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dia do Pagamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payment_day || ''}
                    onChange={(e) => setFormData({ ...formData, payment_day: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.subscription_status || ''}
                    onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as Client['subscription_status'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  >
                    <option value="pending">Pendente</option>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Prontuário Médico</label>
                <textarea
                  value={formData.medical_record || ''}
                  onChange={(e) => setFormData({ ...formData, medical_record: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingClient ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientManagement;