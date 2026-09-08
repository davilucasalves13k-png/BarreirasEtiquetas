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

// Serve arquivos estáticos da pasta atual (caso queira colocar seu index.html na mesma pasta)
app.use(express.static(__dirname));

// Estado global sincronizado do painel
let configAdminGlobal = {
  descontoGlobal: 0,
  freteGratis: 'nao',
  filaFator: 1,
  ganhosTotais: 0,
  totalPedidos: 0
};

io.on('connection', (socket) => {
  console.log(`> Novo cliente conectado: ${socket.id}`);

  // Envia as configurações atuais logo que o usuário entra na página
  socket.emit('config_atualizada', configAdminGlobal);

  // O dono alterou o desconto, frete ou fila
  socket.on('alterar_config_admin', (novaConfig) => {
    configAdminGlobal = novaConfig;
    console.log('> Configuração alterada pelo admin:', configAdminGlobal);
    
    // Transmite a alteração para TODOS os clientes conectados na hora
    io.emit('config_atualizada', configAdminGlobal);
  });

  socket.on('disconnect', () => {
    console.log(`< Cliente desconectado: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}. Acesse: http://localhost:${PORT}`);
});
