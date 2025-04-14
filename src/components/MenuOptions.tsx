import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MenuOption {
  id: string;
  title: string;
  description: string;
  order: number;
}

function MenuOptions() {
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState<MenuOption | null>(null);
  const [newOption, setNewOption] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    try {
      const { data, error } = await supabase
        .from('menu_options')
        .select('*')
        .order('order');

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
      alert('Erro ao carregar opções do menu');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOption(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOption) {
        const { error } = await supabase
          .from('menu_options')
          .update({
            title: editingOption.title,
            description: editingOption.description,
          })
          .eq('id', editingOption.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_options')
          .insert([
            {
              title: newOption.title,
              description: newOption.description,
              order: options.length + 1,
            },
          ]);

        if (error) throw error;
      }

      setEditingOption(null);
      setNewOption({ title: '', description: '' });
      await fetchOptions();
    } catch (error) {
      console.error('Erro ao salvar opção:', error);
      alert('Erro ao salvar opção do menu');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOption(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta opção?')) return;

    try {
      const { error } = await supabase
        .from('menu_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchOptions();
    } catch (error) {
      console.error('Erro ao excluir opção:', error);
      alert('Erro ao excluir opção do menu');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Opções do Menu</h1>

      {/* Formulário de nova opção */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingOption ? 'Editar Opção' : 'Nova Opção'}
        </h2>
        <form onSubmit={handleSaveOption} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={editingOption ? editingOption.title : newOption.title}
              onChange={(e) =>
                editingOption
                  ? setEditingOption({ ...editingOption, title: e.target.value })
                  : setNewOption({ ...newOption, title: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: SAC, Financeiro, Vendas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={editingOption ? editingOption.description : newOption.description}
              onChange={(e) =>
                editingOption
                  ? setEditingOption({ ...editingOption, description: e.target.value })
                  : setNewOption({ ...newOption, description: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Descreva o propósito desta opção"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Save size={20} />
              <span>{editingOption ? 'Atualizar' : 'Adicionar'}</span>
            </button>
            {editingOption && (
              <button
                type="button"
                onClick={() => setEditingOption(null)}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de opções */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {options.map((option) => (
          <div key={option.id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.description}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingOption(option)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={() => handleDeleteOption(option.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuOptions;