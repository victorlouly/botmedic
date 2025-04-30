import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'baixa' | 'média' | 'alta';
  tags: string[];
  contact: string;
  phone: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface MenuOption {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  last_message_at: string;
}

interface ContextMenu {
  x: number;
  y: number;
  taskId: number;
  phone: string;
}

function Kanban() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  useEffect(() => {
    loadData();

    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: menuOptions, error: menuError } = await supabase
        .from('menu_options')
        .select('*')
        .order('order');

      if (menuError) throw menuError;

      const { data: contacts, error: contactsError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (contactsError) throw contactsError;

      const newColumns = menuOptions.map((option: MenuOption) => {
        const departmentContacts = contacts.filter((contact: Contact) =>
          contact.tags?.includes(`dept:${option.title}`)
        );

        const tasks = departmentContacts.map((contact: Contact) => ({
          id: parseInt(contact.id),
          title: contact.name,
          description: `Telefone: ${contact.phone}`,
          priority: 'média',
          tags: contact.tags.filter(tag => !tag.startsWith('dept:')),
          contact: contact.name,
          phone: contact.phone
        }));

        return {
          id: option.id,
          title: option.title,
          tasks
        };
      });

      const unassignedContacts = contacts.filter((contact: Contact) =>
        !contact.tags?.some(tag => tag.startsWith('dept:'))
      );

      newColumns.push({
        id: 'unassigned',
        title: 'Sem Departamento',
        tasks: unassignedContacts.map((contact: Contact) => ({
          id: parseInt(contact.id),
          title: contact.name,
          description: `Telefone: ${contact.phone}`,
          priority: 'média',
          tags: contact.tags || [],
          contact: contact.name,
          phone: contact.phone
        }))
      });

      setColumns(newColumns);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleContextMenu = (e: React.MouseEvent, taskId: number, phone: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      taskId,
      phone
    });
  };

  const handleOpenChat = (contact: { name: string, phone: string }) => {
    const cleanPhone = contact.phone.replace(/\D/g, '');
    navigate('/messages', { 
      state: { 
        selectedPhone: cleanPhone,
        searchQuery: contact.name
      } 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-100 text-red-600';
      case 'média':
        return 'bg-yellow-100 text-yellow-600';
      case 'baixa':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quadro Kanban</h1>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <Plus size={20} />
          <span>Adicionar Tarefa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">{column.title}</h2>
              <span className="text-sm text-gray-500">{column.tasks.length} contatos</span>
            </div>
            <div className="p-4 space-y-4">
              {column.tasks.map((task) => (
                <div 
                  key={`${column.id}-${task.id}`} 
                  className="bg-white border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <button 
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={(e) => handleContextMenu(e, task.id, task.phone)}
                    >
                      <MoreVertical size={16} className="text-gray-500" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-blue-600 text-xs font-medium">
                        {task.contact.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{task.contact}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag, tagIndex) => (
                        <span
                          key={`${column.id}-${task.id}-${tagIndex}`}
                          className="flex items-center text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                        >
                          <Tag size={12} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg py-1 z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
            onClick={() => {
              const task = columns
                .flatMap(col => col.tasks)
                .find(t => t.id === contextMenu.taskId);
              if (task) {
                handleOpenChat({
                  name: task.contact,
                  phone: task.phone
                });
              }
              setContextMenu(null);
            }}
          >
            Abrir Conversa
          </button>
        </div>
      )}
    </div>
  );
}

export default Kanban;