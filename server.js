const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve arquivos estáticos da pasta atual
app.use(express.static(__dirname));

// Estado global do painel
let configAdminGlobal = {
  descontoGlobal: 0,
  freteGratis: 'nao',
  filaFator: 1
};

io.on('connection', (socket) => {
  console.log(`> Usuário conectado: ${socket.id}`);

  // Envia o estado atual assim que o usuário entra
  socket.emit('config_atualizada', configAdminGlobal);

  // Quando o admin altera qualquer coisa
  socket.on('alterar_config_admin', (novaConfig) => {
    configAdminGlobal = novaConfig;
    console.log('> Configuração atualizada:', configAdminGlobal);
    
    // Envia a mudança para TODOS os clientes conectados na mesma hora
    io.emit('config_atualizada', configAdminGlobal);
  });

  socket.on('disconnect', () => {
    console.log(`< Usuário desconectado: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando! Acesse: http://localhost:${PORT}`);
});
