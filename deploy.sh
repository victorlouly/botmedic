#!/bin/bash

# Instalar dependências
npm install

# Build do frontend
npm run build

# Instalar PM2 globalmente se não estiver instalado
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar com o sistema
pm2 startup