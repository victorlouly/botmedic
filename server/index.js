import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { webcrypto } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

// Polyfill para crypto
if (!global.crypto) {
  global.crypto = webcrypto;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUTH_DIR = join(__dirname, 'auth_info_baileys');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const httpServer = createServer(app);

// Configurar CORS para o Express
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar middleware para parsing de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar CORS para o Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Configurações do Asaas
const ASAAS_API_URL = 'https://api.asaas.com/v3';
const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': process.env.VITE_ASAAS_API_KEY
};

// Endpoints do Asaas
app.get('/api/asaas/payments', async (req, res) => {
  try {
    console.log('Recebendo requisição para /api/asaas/payments', req.query);
    const { startDate, endDate, status, offset, limit } = req.query;
    
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.append('startDate', startDate);
    if (endDate) searchParams.append('endDate', endDate);
    if (status && status !== 'all') {
      searchParams.append('status', status.toUpperCase());
    }
    searchParams.append('offset', String(offset || 0));
    searchParams.append('limit', String(limit || 10));

    const url = `${ASAAS_API_URL}/payments?${searchParams.toString()}`;
    console.log('Fazendo requisição para Asaas:', url);

    const response = await fetch(url, { 
      headers: asaasHeaders,
      method: 'GET'
    });

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', response.status, response.statusText);
      throw new Error(`Erro na API do Asaas: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Resposta do Asaas recebida com sucesso');
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos', details: error.message });
  }
});

app.get('/api/asaas/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando cliente:', id);

    const response = await fetch(`${ASAAS_API_URL}/customers/${id}`, {
      headers: asaasHeaders,
      method: 'GET'
    });

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', response.status, response.statusText);
      throw new Error(`Erro ao buscar cliente: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente', details: error.message });
  }
});

app.get('/api/asaas/payments/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Exportando pagamentos:', { startDate, endDate });

    const searchParams = new URLSearchParams({
      startDate: String(startDate),
      endDate: String(endDate),
      format: 'csv'
    });

    const response = await fetch(
      `${ASAAS_API_URL}/payments/export?${searchParams.toString()}`,
      { 
        headers: asaasHeaders,
        method: 'GET'
      }
    );

    if (!response.ok) {
      console.error('Erro na resposta do Asaas:', response.status, response.statusText);
      throw new Error(`Erro ao exportar pagamentos: ${response.statusText}`);
    }

    const data = await response.buffer();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pagamentos-${startDate}-${endDate}.csv`);
    res.send(data);
  } catch (error) {
    console.error('Erro ao exportar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao exportar pagamentos', details: error.message });
  }
});

let sock = null;
let qrCode = null;
let isConnected = false;
let deviceInfo = null;
let connectionId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_CONVERSATION_HISTORY = 200;

// Armazenar contexto das conversas
const conversationContexts = new Map();

async function getMenuOptions() {
  try {
    const { data, error } = await supabase
      .from('menu_options')
      .select('*')
      .order('order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar opções do menu:', error);
    return [];
  }
}

async function getPromptForOption(optionId) {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('menu_option_id', optionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar prompt:', error);
    return null;
  }
}

async function updateContactDepartment(contactId, department) {
  try {
    const { data: contact, error: getError } = await supabase
      .from('whatsapp_contacts')
      .select('tags')
      .eq('id', contactId)
      .single();

    if (getError) throw getError;

    // Remove any existing department tags
    const existingTags = contact.tags || [];
    const nonDepartmentTags = existingTags.filter(tag => !tag.startsWith('dept:'));
    
    // Add new department tag
    const newTags = [...nonDepartmentTags, `dept:${department}`];

    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({ tags: newTags })
      .eq('id', contactId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Erro ao atualizar departamento do contato:', error);
  }
}

async function generateAIResponse(prompt, userMessage, conversationHistory) {
  try {
    const messages = [
      { role: "system", content: prompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      messages,
      model: "gpt-4",
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
  } catch (error) {
    console.error('Erro ao gerar resposta da IA:', error);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
  }
}

async function generateWelcomeMessage() {
  try {
    const options = await getMenuOptions();
    return `Olá! 👋 Bem-vindo ao nosso atendimento. Como posso ajudar você hoje?

Escolha uma das opções abaixo:

${options.map((opt, index) => `${index + 1}️⃣ - ${opt.title}`).join('\n')}

Responda com o número da opção desejada.
Digite 0️⃣ a qualquer momento para encerrar o atendimento.`;
  } catch (error) {
    console.error('Erro ao gerar mensagem de boas-vindas:', error);
    return 'Desculpe, não foi possível carregar o menu de opções.';
  }
}

async function handleIncomingMessage(message, contact) {
  try {
    const userMessage = message.message?.conversation?.trim() || message.message?.extendedTextMessage?.text?.trim();
    const remoteJid = message.key.remoteJid;

    // Verificar se é um grupo e ignorar
    if (remoteJid.endsWith('@g.us')) {
      console.log('Mensagem de grupo ignorada:', remoteJid);
      return;
    }

    // Verificar se o contato está em atendimento manual
    const { data: contactData } = await supabase
      .from('whatsapp_contacts')
      .select('is_manual_service')
      .eq('id', contact.id)
      .single();

    if (contactData?.is_manual_service) {
      console.log('Contato em atendimento manual, ignorando resposta automática:', contact.id);
      return;
    }

    // Verificar se é a primeira mensagem do contato
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: true });

    if (messages.length <= 1) {
      // Primeira mensagem - enviar menu
      const welcomeMessage = await generateWelcomeMessage();
      await sock.sendMessage(remoteJid, { text: welcomeMessage });
      
      await supabase
        .from('whatsapp_messages')
        .insert({
          content: welcomeMessage,
          sender_type: 'bot',
          contact_id: contact.id,
          created_at: new Date().toISOString()
        });

      return;
    }

    if (!userMessage) return;

    // Verificar se o usuário quer encerrar o atendimento
    if (userMessage === '0') {
      const goodbyeMessage = 'Atendimento encerrado. Obrigado por utilizar nossos serviços! 👋';
      await sock.sendMessage(remoteJid, { text: goodbyeMessage });
      
      await supabase
        .from('whatsapp_messages')
        .insert({
          content: goodbyeMessage,
          sender_type: 'bot',
          contact_id: contact.id,
          created_at: new Date().toISOString()
        });

      // Limpar contexto da conversa
      conversationContexts.delete(remoteJid);
      return;
    }

    // Verificar se já existe um contexto de conversa
    let context = conversationContexts.get(remoteJid);

    if (!context) {
      // Se não existe contexto, verificar se é uma opção do menu
      const options = await getMenuOptions();
      const selectedOption = options[parseInt(userMessage) - 1];

      if (selectedOption) {
        const prompt = await getPromptForOption(selectedOption.id);
        if (prompt) {
          // Atualizar tag do departamento no contato
          await updateContactDepartment(contact.id, selectedOption.title);

          // Iniciar novo contexto
          context = {
            prompt: prompt.content,
            history: []
          };
          conversationContexts.set(remoteJid, context);

          // Enviar mensagem inicial do departamento
          const initialMessage = "Como posso ajudar você hoje?";
          await sock.sendMessage(remoteJid, { text: initialMessage });
          
          await supabase
            .from('whatsapp_messages')
            .insert({
              content: initialMessage,
              sender_type: 'bot',
              contact_id: contact.id,
              created_at: new Date().toISOString()
            });

          return;
        }
      } else {
        // Opção inválida
        const menuMessage = await generateWelcomeMessage();
        await sock.sendMessage(remoteJid, { text: 'Opção inválida. Por favor, escolha uma das opções abaixo:\n\n' + menuMessage });
        return;
      }
    }

    // Adicionar mensagem do usuário ao histórico
    context.history.push({ role: "user", content: userMessage });

    // Gerar resposta da IA
    const aiResponse = await generateAIResponse(context.prompt, userMessage, context.history);

    // Adicionar resposta da IA ao histórico
    context.history.push({ role: "assistant", content: aiResponse });

    // Manter apenas as últimas MAX_CONVERSATION_HISTORY mensagens no histórico
    if (context.history.length > MAX_CONVERSATION_HISTORY) {
      context.history = context.history.slice(-MAX_CONVERSATION_HISTORY);
    }

    // Enviar resposta
    await sock.sendMessage(remoteJid, { text: aiResponse });
    
    // Salvar mensagem no banco
    await supabase
      .from('whatsapp_messages')
      .insert({
        content: aiResponse,
        sender_type: 'bot',
        contact_id: contact.id,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

async function updateConnectionStatus(status) {
  try {
    if (!connectionId) {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert([{
          is_connected: status.connected,
          device_name: status.device?.name,
          device_number: status.device?.number,
          qr_code: qrCode,
          auth_file: status.authFile
        }])
        .select()
        .single();

      if (error) throw error;
      connectionId = data.id;
    } else {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          is_connected: status.connected,
          device_name: status.device?.name,
          device_number: status.device?.number,
          qr_code: qrCode,
          auth_file: status.authFile,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar status da conexão:', error);
  }
}

async function getLastConnection() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    if (data) {
      connectionId = data.id;
      isConnected = data.is_connected;
      qrCode = data.qr_code;
      if (data.is_connected) {
        deviceInfo = {
          name: data.device_name,
          number: data.device_number
        };
      }
    }
  } catch (error) {
    console.error('Erro ao buscar última conexão:', error);
  }
}

async function startWhatsApp() {
  try {
    await mkdir(AUTH_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['CRM Bot', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 40000,
      retryRequestDelayMs: 2000,
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: true
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log('Connection update:', update);

      if (qr) {
        try {
          qrCode = await QRCode.toDataURL(qr);
          io.emit('qr', qrCode);
          await updateConnectionStatus({ connected: false });
          console.log('QR Code generated and emitted');
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom) && 
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        console.log('Connection closed. Should reconnect:', shouldReconnect);
        console.log('Disconnect reason:', lastDisconnect?.error?.output?.statusCode);
        
        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log(`Tentativa de reconexão ${reconnectAttempts + 1} de ${MAX_RECONNECT_ATTEMPTS}`);
          reconnectAttempts++;
          setTimeout(startWhatsApp, 5000);
        } else {
          console.log('Conexão encerrada' + (shouldReconnect ? ' - Máximo de tentativas atingido' : ' por logout'));
          reconnectAttempts = 0;
          sock = null;
        }
        
        isConnected = false;
        deviceInfo = null;
        await updateConnectionStatus({ connected: false });
        io.emit('connection-status', { connected: false });
      } else if (connection === 'open') {
        console.log('Conexão estabelecida com sucesso!');
        isConnected = true;
        reconnectAttempts = 0;
        deviceInfo = {
          name: sock.user?.name || 'Desconhecido',
          number: sock.user?.id?.split(':')[0] || 'Desconhecido',
        };
        await updateConnectionStatus({ connected: true, device: deviceInfo });
        io.emit('connection-status', {
          connected: true,
          device: deviceInfo,
        });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      
      // Ignorar mensagens de grupos
      if (message.key.remoteJid.endsWith('@g.us')) {
        return;
      }

      if (!message.key.fromMe) {
        try {
          // Busca ou cria o contato
          const phone = message.key.remoteJid.split('@')[0];
          let contact;
          
          const { data: existingContact } = await supabase
            .from('whatsapp_contacts')
            .select()
            .eq('phone', phone)
            .single();

          if (!existingContact) {
            const { data: newContact } = await supabase
              .from('whatsapp_contacts')
              .insert({
                name: message.pushName || phone,
                phone: phone,
                tags: ['Novo Contato']
              })
              .select()
              .single();
            
            contact = newContact;
          } else {
            contact = existingContact;
          }

          // Salva a mensagem
          await supabase
            .from('whatsapp_messages')
            .insert({
              content: message.message?.conversation || message.message?.extendedTextMessage?.text,
              sender_type: 'contact',
              contact_id: contact.id,
              created_at: new Date(message.messageTimestamp * 1000).toISOString()
            });

          // Atualiza o último contato
          await supabase
            .from('whatsapp_contacts')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', contact.id);

          // Processa a mensagem e envia resposta automática
          await handleIncomingMessage(message, contact);

          // Emite a mensagem para todos os clientes
          io.emit('message', {
            from: message.key.remoteJid,
            content: message.message?.conversation || message.message?.extendedTextMessage?.text,
            timestamp: message.messageTimestamp,
            contact: contact
          });
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar WhatsApp:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`Tentando reconectar em 5 segundos... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(startWhatsApp, 5000);
    }
    throw error;
  }
}

// Inicializar estado da conexão do banco de dados
getLastConnection();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.emit('connection-status', {
    connected: isConnected,
    device: deviceInfo,
  });

  if (qrCode && !isConnected) {
    socket.emit('qr', qrCode);
  }

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Rotas da API do WhatsApp
app.post('/connect', async (req, res) => {
  try {
    console.log('Iniciando conexão WhatsApp');
    if (!sock) {
      await startWhatsApp();
      res.json({ status: 'connecting', message: 'Iniciando conexão' });
    } else {
      res.json({ status: 'already_connected', message: 'WhatsApp já está conectado' });
    }
  } catch (error) {
    console.error('Erro ao conectar:', error);
    res.status(500).json({ 
      error: 'Erro ao iniciar conexão',
      details: error.message
    });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    console.log('Desconectando WhatsApp');
    if (sock) {
      await sock.logout();
      sock = null;
      qrCode = null;
      isConnected = false;
      deviceInfo = null;
      reconnectAttempts = 0;

      if (connectionId) {
        await supabase
          .from('whatsapp_connections')
          .delete()
          .eq('id', connectionId);
        connectionId = null;
      }

      try {
        await rm(AUTH_DIR, { recursive: true, force: true });
        console.log('Diretório de autenticação removido com sucesso');
      } catch (error) {
        console.error('Erro ao remover diretório de autenticação:', error);
      }

      io.emit('connection-status', { connected: false });
      res.json({ status: 'disconnected', message: 'WhatsApp desconectado com sucesso' });
    } else {
      res.json({ status: 'not_connected', message: 'WhatsApp não está conectado' });
    }
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ 
      error: 'Erro ao desconectar',
      details: error.message
    });
  }
});

app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    device: deviceInfo,
  });
});

app.post('/send', async (req, res) => {
  if (!sock || !isConnected) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  try {
    const { number, message } = req.body;
    console.log('Enviando mensagem para:', number);
    
    const jid = `${number}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    
    res.json({ status: 'sent', message: 'Mensagem enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem',
      details: error.message
    });
  }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: err.message
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});