// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Bot, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalContacts: number;
  activeChats: number;
  botResponses: number;
  aiInteractions: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    activeChats: 0,
    botResponses: 0,
    aiInteractions: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Buscar total de contatos
      const { count: totalContacts } = await supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact' });

      // Buscar contatos ativos (com mensagens nas últimas 24h)
      const { count: activeChats } = await supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact' })
        .gte('last_message_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Buscar total de mensagens do bot
      const { count: botResponses } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact' })
        .eq('sender_type', 'bot');

      // Buscar atividades recentes
      const { data: recentMessages } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          content,
          sender_type,
          created_at,
          whatsapp_contacts (
            name,
            phone
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentActivities = recentMessages?.map(message => ({
        id: message.id,
        type: 'message',
        description: `${message.whatsapp_contacts.name} enviou uma mensagem`,
        timestamp: message.created_at
      })) || [];

      setStats({
        totalContacts: totalContacts || 0,
        activeChats: activeChats || 0,
        botResponses: botResponses || 0,
        aiInteractions: botResponses || 0, // Usando mesmo valor de botResponses como exemplo
        recentActivities
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Contatos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalContacts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Chats Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeChats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Respostas do Bot</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.botResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Zap className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Interações IA</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.aiInteractions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h2>
        <div className="space-y-4">
          {stats.recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(activity.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
