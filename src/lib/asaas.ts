import axios from 'axios';

const api = axios.create({
  baseURL: '/api/asaas',
  headers: {
    'Content-Type': 'application/json'
  }
});

interface AsaasPayment {
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
  customerEmail: string;
  customerCpfCnpj: string;
  dateCreated: string;
  originalValue: number | null;
  interestValue: number | null;
  pixTransaction: string | null;
  originalDueDate: string;
  clientPaymentDate: string | null;
  installmentNumber: number | null;
  invoiceNumber: string;
  externalReference: string | null;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  creditDate: string | null;
  estimatedCreditDate: string | null;
  transactionReceiptUrl: string | null;
  nossoNumero: string | null;
  bankSlipUrl: string | null;
  lastInvoiceViewedDate: string | null;
  lastBankSlipViewedDate: string | null;
  postalService: boolean;
  discount: {
    value: number;
    limitDate: string | null;
    dueDateLimitDays: number;
    type: string;
  };
  fine: {
    value: number;
    type: string;
  };
  interest: {
    value: number;
    type: string;
  };
}

interface AsaasResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

export const asaasApi = {
  async getPayments(params: {
    startDate?: string;
    endDate?: string;
    status?: string;
    offset?: number;
    limit?: number;
  }) {
    try {
      const { data } = await api.get<AsaasResponse<AsaasPayment>>('/payments', { params });
      return data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      throw error;
    }
  },

  async getCustomer(customerId: string) {
    try {
      const { data } = await api.get(`/customers/${customerId}`);
      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  },

  async exportPayments(startDate: string, endDate: string) {
    try {
      const response = await api.get('/payments/export', {
        params: { startDate, endDate },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagamentos-${startDate}-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar pagamentos:', error);
      throw error;
    }
  }
};