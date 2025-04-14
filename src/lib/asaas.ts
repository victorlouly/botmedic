const API_URL = 'http://localhost:3000/api/asaas';

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
      const searchParams = new URLSearchParams();
      
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      if (params.status && params.status !== 'all') {
        searchParams.append('status', params.status);
      }
      // Adicionar parâmetros de paginação
      searchParams.append('offset', String(params.offset || 0));
      searchParams.append('limit', String(params.limit || 10));

      const response = await fetch(
        `${API_URL}/payments?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Erro na API do Asaas: ${response.statusText}`);
      }

      const data: AsaasResponse<AsaasPayment> = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      throw error;
    }
  },

  async getCustomer(customerId: string) {
    try {
      const response = await fetch(`${API_URL}/customers/${customerId}`);

      if (!response.ok) {
        throw new Error(`Erro ao buscar cliente: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  },

  async exportPayments(startDate: string, endDate: string) {
    try {
      const searchParams = new URLSearchParams({
        startDate,
        endDate,
        format: 'csv'
      });

      const response = await fetch(
        `${API_URL}/payments/export?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Erro ao exportar pagamentos: ${response.statusText}`);
      }

      const blob = await response.blob();
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