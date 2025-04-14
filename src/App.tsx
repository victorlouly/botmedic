import React, { useState, useEffect } from 'react';
import { MessageSquare, Bot, BrainCircuit, LayoutDashboard, LogOut, Menu, X, Users, Phone, ListTodo, Settings, DollarSign } from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WhatsAppMessages from './components/WhatsAppMessages';
import WhatsAppConnection from './components/WhatsAppConnection';
import Kanban from './components/Kanban';
import Contacts from './components/Contacts';
import MenuOptions from './components/MenuOptions';
import PromptManager from './components/PromptManager';
import AsaasFinanceiro from './components/AsaasFinanceiro';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Verificar sessão atual
    checkUser();

    // Configurar listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      setIsAuthenticated(true);
      setUser(data.user);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error; // Propagar erro para o componente Login
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'messages':
        return <WhatsAppMessages />;
      case 'connection':
        return <WhatsAppConnection />;
      case 'kanban':
        return <Kanban />;
      case 'contacts':
        return <Contacts />;
      case 'menu-options':
        return <MenuOptions />;
      case 'prompts':
        return <PromptManager />;
      case 'asaas':
        return <AsaasFinanceiro />;
      default:
        return <Dashboard />;
    }
  };

  // Mostrar loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-white shadow-xl`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">CRM Bot</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-2">{user.email}</p>
            )}
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('messages')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'messages' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <MessageSquare size={20} />
                  <span>Mensagens WhatsApp</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('connection')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'connection' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Phone size={20} />
                  <span>Conexão WhatsApp</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('kanban')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'kanban' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <ListTodo size={20} />
                  <span>Quadro Kanban</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('contacts')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'contacts' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Users size={20} />
                  <span>Contatos</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('menu-options')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'menu-options' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Settings size={20} />
                  <span>Opções do Menu</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('prompts')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'prompts' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Bot size={20} />
                  <span>Gerenciar Prompts</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('asaas')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'asaas' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <DollarSign size={20} />
                  <span>Financeiro Asaas</span>
                </button>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 text-red-600 w-full"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:ml-64 p-8">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;