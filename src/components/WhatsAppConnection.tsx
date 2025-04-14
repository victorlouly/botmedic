import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Check, X } from 'lucide-react';
import { socket, whatsappApi } from '../lib/whatsapp';

function WhatsAppConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState({
    name: '',
    number: '',
    lastConnected: ''
  });

  useEffect(() => {
    // Listen for connection status updates
    socket.on('connection-status', (status) => {
      console.log('Connection status:', status);
      setIsConnected(status.connected);
      setIsConnecting(false);
      setIsDisconnecting(false);
      if (status.connected && status.device) {
        setDeviceInfo({
          name: status.device.name,
          number: status.device.number,
          lastConnected: new Date().toLocaleString()
        });
        // Clear QR code when connected
        setQrCode('');
      }
    });

    // Listen for QR code updates
    socket.on('qr', (qr) => {
      console.log('QR code received');
      setQrCode(qr);
      setIsConnecting(false);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('connection-status');
      socket.off('qr');
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await whatsappApi.connect();
    } catch (err) {
      console.error('Error starting connection:', err);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await whatsappApi.disconnect();
      setQrCode('');
      setDeviceInfo({
        name: '',
        number: '',
        lastConnected: ''
      });
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isConnected ? <Check size={20} /> : <X size={20} />}
          <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center space-y-4">
            <div className="inline-block p-3 rounded-full bg-blue-100 text-blue-600 mb-2">
              <QrCode size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Escanear QR Code</h2>
            <p className="text-gray-600">
              {!isConnected && !isConnecting 
                ? 'Clique em "Conectar WhatsApp" para gerar o QR code'
                : 'Abra o WhatsApp no seu celular e escaneie o QR code para conectar'}
            </p>
            <div className="border-4 border-gray-200 rounded-lg p-4 max-w-xs mx-auto">
              {isConnecting ? (
                <div className="aspect-square bg-gray-100 rounded flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <span className="text-gray-600">Gerando QR Code...</span>
                </div>
              ) : qrCode ? (
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-full"
                  onError={(e) => console.error('Error loading QR code:', e)}
                />
              ) : (
                <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-400">
                    Aguardando conexão...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection Instructions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            <div className="inline-block p-3 rounded-full bg-blue-100 text-blue-600 mb-2">
              <Smartphone size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Instruções de Conexão</h2>
            <ol className="space-y-4 text-gray-600">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</span>
                <span>Abra o WhatsApp no seu celular</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">2</span>
                <span>Toque em Menu ou Configurações e selecione WhatsApp Web</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">3</span>
                <span>Aponte seu celular para esta tela para capturar o QR code</span>
              </li>
            </ol>

            <div className="mt-8">
              <button
                onClick={isConnected ? handleDisconnect : handleConnect}
                disabled={isConnecting || isDisconnecting}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center ${
                  isConnected 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : isConnecting || isDisconnecting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isConnecting || isDisconnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>{isConnecting ? 'Conectando...' : 'Desconectando...'}</span>
                  </>
                ) : (
                  <span>{isConnected ? 'Desconectar WhatsApp' : 'Conectar WhatsApp'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status da Conexão</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Nome do Dispositivo</span>
            <span className="font-medium text-gray-900">{deviceInfo.name || 'Não conectado'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Número do Telefone</span>
            <span className="font-medium text-gray-900">{deviceInfo.number || 'Não conectado'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <span className="text-gray-600">Última Conexão</span>
            <span className="font-medium text-gray-900">{deviceInfo.lastConnected || 'Nunca'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Status da Conexão</span>
            <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppConnection;