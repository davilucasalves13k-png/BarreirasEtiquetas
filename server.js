const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Serve os arquivos estáticos (como o index.html) da mesma pasta
app.use(express.static(__dirname));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Estado global de configurações do Admin
let configAdminGlobal = {
  descontoGlobal: 0,
  freteGratis: 'nao',       // 'sim' ou 'nao'
  fatorFilaBase: 1,         // Multiplicador base da fila
  modoCupomExtra: 'nenhum', // Ex: 'nenhum', 'cashback', 'brinde'
  taxaFixaFrete: 15.00
};

// Armazena os pedidos/clientes para calcular a fila individual baseada na ordem de chegada
let filaPedidos = []; // Contém os socket.ids na ordem em que fizeram pedido

io.on('connection', (socket) => {
  console.log(`> Usuário conectado: ${socket.id}`);

  // Envia as configurações atuais assim que o cliente conecta
  socket.emit('config_atualizada', {
    ...configAdminGlobal,
    meuTempoFila: calcularTempoFilaParaUsuario(socket.id)
  });

  // 1. Admin altera a configuração global
  socket.on('alterar_config_admin', (novaConfig) => {
    configAdminGlobal = { ...configAdminGlobal, ...novaConfig };
    console.log('> Configuração global atualizada:', configAdminGlobal);
    
    // Propaga a nova config para todos, recalculando o tempo de fila de cada um
    io.sockets.sockets.forEach((sClient) => {
      sClient.emit('config_atualizada', {
        ...configAdminGlobal,
        meuTempoFila: calcularTempoFilaParaUsuario(sClient.id)
      });
    });
  });

  // 2. Usuário faz um pedido (entra na fila dinâmica)
  socket.on('fazer_pedido', () => {
    // Se o usuário já não estiver na fila, adiciona ele no final
    if (!filaPedidos.includes(socket.id)) {
      filaPedidos.push(socket.id);
      console.log(`> Novo pedido na fila. Total na fila: ${filaPedidos.length}`);
    }

    // Atualiza o tempo de fila para TODOS os clientes conectados
    io.sockets.sockets.forEach((sClient) => {
      sClient.emit('config_atualizada', {
        ...configAdminGlobal,
        meuTempoFila: calcularTempoFilaParaUsuario(sClient.id)
      });
    });
  });

  socket.on('disconnect', () => {
    console.log(`< Usuário desconectado: ${socket.id}`);
    // Remove o usuário da fila quando ele desconecta
    filaPedidos = filaPedidos.filter(id => id !== socket.id);
  });
});

// Lógica de Fila Dinâmica: quem pediu antes tem tempo menor; quem pediu depois espera mais
function calcularTempoFilaParaUsuario(socketId) {
  const tempoBaseMinutos = 10;
  const indexNaFila = filaPedidos.indexOf(socketId);

  if (indexNaFila === -1) {
    // Se ainda não fez pedido, pega o tempo padrão base multiplicado pelo fator admin
    return Math.round(tempoBaseMinutos * configAdminGlobal.fatorFilaBase);
  } else {
    // Se já fez pedido, a posição dele na fila adiciona tempo acumulado (ex: +3 min por pessoa na frente)
    const atrasoPorPosicao = indexNaFila * 3; 
    return Math.round((tempoBaseMinutos + atrasoPorPosicao) * configAdminGlobal.fatorFilaBase);
  }
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
