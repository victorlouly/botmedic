import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle, Clock, ArrowUpRight, Download, Filter, Eye } from 'lucide-react';
import { asaasApi } from '../lib/asaas';

interface CustomerData {
  id: string;
  dateCreated: string;
  name: string;
  email: string;
  company: string | null;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  postalCode: string;
  cpfCnpj: string;
  personType: string;
  cityName: string;
  state: string;
  country: string;
}

interface Payment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  description: string;
  invoiceUrl?: string;
  customerData?: CustomerData;
  dateCreated: string;
}

interface DashboardStats {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  conversionRate: number;
}

function CustomerModal({ customer, onClose }: { customer: CustomerData; onClose: () => void }) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Detalhes do Cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-700">Informações Pessoais</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Nome:</span> {customer.name}</p>
              <p><span className="font-medium">Email:</span> {customer.email}</p>
              <p><span className="font-medium">CPF/CNPJ:</span> {customer.cpfCnpj}</p>
              <p><span className="font-medium">Tipo:</span> {customer.personType === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
              {customer.company && <p><span className="font-medium">Empresa:</span> {customer.company}</p>}
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="font-semibold text-gray-700">Contato</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Telefone:</span> {customer.phone}</p>
              <p><span className="font-medium">Celular:</span> {customer.mobilePhone}</p>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="font-semibold text-gray-700">Endereço</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Logradouro:</span> {customer.address}</p>
              <p><span className="font-medium">Número:</span> {customer.addressNumber}</p>
              {customer.complement && <p><span className="font-medium">Complemento:</span> {customer.complement}</p>}
              <p><span className="font-medium">Bairro:</span> {customer.province}</p>
              <p><span className="font-medium">CEP:</span> {customer.postalCode}</p>
              <p><span className="font-medium">Cidade:</span> {customer.cityName}</p>
              <p><span className="font-medium">Estado:</span> {customer.state}</p>
              <p><span className="font-medium">País:</span> {customer.country}</p>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="font-semibold text-gray-700">Informações Adicionais</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Data de Cadastro:</span> {new Date(customer.dateCreated).toLocaleDateString()}</p>
              <p><span className="font-medium">ID do Cliente:</span> {customer.id}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function AsaasFinanceiro() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPayments();
  }, [filter, dateRange, currentPage]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await asaasApi.getPayments({
        startDate: dateRange.start,
        endDate: dateRange.end,
        status: filter,
        offset: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });

      const paymentsWithCustomerData = await Promise.all(
        response.data.map(async (payment) => {
          try {
            const customerData = await asaasApi.getCustomer(payment.customer);
            return {
              ...payment,
              customerData: customerData
            };
          } catch (error) {
            console.error(`Erro ao buscar dados do cliente ${payment.customer}:`, error);
            return payment;
          }
        })
      );

      setPayments(paymentsWithCustomerData);
      setTotalItems(response.totalCount);
      setTotalPages(Math.ceil(response.totalCount / itemsPerPage));
      calculateStats(paymentsWithCustomerData);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      setError('Erro ao carregar pagamentos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await asaasApi.exportPayments(dateRange.start, dateRange.end);
    } catch (error) {
      console.error('Erro ao exportar pagamentos:', error);
      setError('Erro ao exportar pagamentos. Por favor, tente novamente.');
    }
  };

  const calculateStats = (payments: Payment[]) => {
    const received = payments.filter(p => p.status === 'RECEIVED').reduce((acc, p) => acc + p.value, 0);
    const pending = payments.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + p.value, 0);
    const overdue = payments.filter(p => p.status === 'OVERDUE').reduce((acc, p) => acc + p.value, 0);
    
    setStats({
      totalReceived: received,
      totalPending: pending,
      totalOverdue: overdue,
      conversionRate: (received / (received + pending + overdue)) * 100 || 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'OVERDUE':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro Asaas</h1>
        <button 
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Download size={20} />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          <div className="flex-1 flex space-x-4">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">Todos os status</option>
            <option value="RECEIVED">Recebidos</option>
            <option value="PENDING">Pendentes</option>
            <option value="OVERDUE">Vencidos</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Recebido</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalReceived)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendente</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalPending)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vencido</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalOverdue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowUpRight className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.customerData?.name || 'Cliente não encontrado'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.customerData?.email || 'Email não disponível'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {payment.customerData?.cpfCnpj || 'CPF/CNPJ não disponível'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.value)}</div>
                    <div className="text-sm text-gray-500">Líquido: {formatCurrency(payment.netValue)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.billingType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.customerData && (
                      <button
                        onClick={() => setSelectedCustomer(payment.customerData)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{' '}
              de{' '}
              <span className="font-medium">{totalItems}</span> resultados
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Anterior</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === index + 1
                      ? 'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Próxima</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

export default AsaasFinanceiro;