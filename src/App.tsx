import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import ClientManagement from './components/ClientManagement';

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    setCurrentPage(path);
  }, [location]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navigateToPage = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
    setIsSidebarOpen(false);
  };

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
                  onClick={() => navigateToPage('dashboard')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('clients')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'clients' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Users size={20} />
                  <span>Gestão de Clientes</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('messages')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'messages' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <MessageSquare size={20} />
                  <span>Mensagens WhatsApp</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('connection')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'connection' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Phone size={20} />
                  <span>Conexão WhatsApp</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('kanban')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'kanban' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <ListTodo size={20} />
                  <span>Quadro Kanban</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('contacts')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'contacts' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Users size={20} />
                  <span>Contatos</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('menu-options')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'menu-options' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Settings size={20} />
                  <span>Opções do Menu</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('prompts')}
                  className={`flex items-center space-x-3 p-3 rounded-lg w-full ${currentPage === 'prompts' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Bot size={20} />
                  <span>Gerenciar Prompts</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateToPage('asaas')}
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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/messages" element={<WhatsAppMessages />} />
          <Route path="/connection" element={<WhatsAppConnection />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/menu-options" element={<MenuOptions />} />
          <Route path="/prompts" element={<PromptManager />} />
          <Route path="/asaas" element={<AsaasFinanceiro />} />
          <Route path="/clients" element={<ClientManagement />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
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
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;