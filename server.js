const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configura o Socket.io permitindo requisições de qualquer lugar (CORS aberto)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let configAdminGlobal = {
  descontoGlobal: 0,
  freteGratis: 'nao',
  filaFator: 1,
  ganhosTotais: 0,
  totalPedidos: 0
};

io.on('connection', (socket) => {
  console.log(`> Usuário conectado: ${socket.id}`);

  // Envia o estado atual assim que entra
  socket.emit('config_atualizada', configAdminGlobal);

  // Quando o admin altera a config e clica em aplicar
  socket.on('alterar_config_admin', (novaConfig) => {
    configAdminGlobal = novaConfig;
    console.log('> Configuração atualizada:', configAdminGlobal);
    
    // Propaga para todas as abas/clientes conectados
    io.emit('config_atualizada', configAdminGlobal);
  });

  socket.on('disconnect', () => {
    console.log(`< Usuário desconectado: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
