import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Prompt {
  id: string;
  title: string;
  content: string;
  menu_option_id: string;
}

interface MenuOption {
  id: string;
  title: string;
}

function PromptManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    content: '',
    menu_option_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [promptsResponse, optionsResponse] = await Promise.all([
        supabase.from('prompts').select('*'),
        supabase.from('menu_options').select('id, title'),
      ]);

      if (promptsResponse.error) throw promptsResponse.error;
      if (optionsResponse.error) throw optionsResponse.error;

      setPrompts(promptsResponse.data || []);
      setMenuOptions(optionsResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar prompts e opções');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPrompt) {
        const { error } = await supabase
          .from('prompts')
          .update({
            title: editingPrompt.title,
            content: editingPrompt.content,
            menu_option_id: editingPrompt.menu_option_id,
          })
          .eq('id', editingPrompt.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prompts')
          .insert([{
            title: newPrompt.title,
            content: newPrompt.content,
            menu_option_id: newPrompt.menu_option_id,
          }]);

        if (error) throw error;
      }

      setEditingPrompt(null);
      setNewPrompt({ title: '', content: '', menu_option_id: '' });
      await fetchData();
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      alert('Erro ao salvar prompt');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    if (!confirm('Tem certeza que deseja excluir este prompt?')) return;

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      alert('Erro ao excluir prompt');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gerenciador de Prompts</h1>

      {/* Formulário de novo prompt */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
        </h2>
        <form onSubmit={handleSavePrompt} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={editingPrompt ? editingPrompt.title : newPrompt.title}
              onChange={(e) =>
                editingPrompt
                  ? setEditingPrompt({ ...editingPrompt, title: e.target.value })
                  : setNewPrompt({ ...newPrompt, title: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do prompt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opção do Menu
            </label>
            <select
              value={editingPrompt ? editingPrompt.menu_option_id : newPrompt.menu_option_id}
              onChange={(e) =>
                editingPrompt
                  ? setEditingPrompt({ ...editingPrompt, menu_option_id: e.target.value })
                  : setNewPrompt({ ...newPrompt, menu_option_id: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione uma opção</option>
              {menuOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo do Prompt
            </label>
            <textarea
              value={editingPrompt ? editingPrompt.content : newPrompt.content}
              onChange={(e) =>
                editingPrompt
                  ? setEditingPrompt({ ...editingPrompt, content: e.target.value })
                  : setNewPrompt({ ...newPrompt, content: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Digite o conteúdo do prompt..."
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
              <span>{editingPrompt ? 'Atualizar' : 'Adicionar'}</span>
            </button>
            {editingPrompt && (
              <button
                type="button"
                onClick={() => setEditingPrompt(null)}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de prompts */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{prompt.title}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingPrompt(prompt)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDeletePrompt(prompt.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Opção: {menuOptions.find(o => o.id === prompt.menu_option_id)?.title}
            </p>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {prompt.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptManager;