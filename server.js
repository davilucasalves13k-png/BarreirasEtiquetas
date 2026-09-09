const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
// Faz o Express servir automaticamente o index.html e arquivos estáticos da mesma pasta
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    }
});

// Estado global do painel de controle (Desconto, Frete, Fila e Campanha Extra)
let configAdminGlobal = {
    descontoGlobal: 0,
    freteGratis: 'nao',
    fatorFilaBase: 1,
    modoCupomExtra: 'nenhum',
    taxaFixaFrete: 15.00
};

// Armazena a ordem de chegada dos usuários que fizeram pedido (FIFO)
let filaPedidos = []; 

io.on('connection', (socket) => {
    console.log(`> Conectado: ${socket.id}`);

    // Envia o estado atual e o tempo de fila individual logo na conexão
    socket.emit('config_atualizada', {
        ...configAdminGlobal,
        meuTempoFila: calcularTempoFila(socket.id)
    });

    // 1. Admin altera as configurações globais
    socket.on('alterar_config_admin', (novaConfig) => {
        configAdminGlobal = { ...configAdminGlobal, ...novaConfig };
        console.log('> Configuração global atualizada:', configAdminGlobal);

        // Propaga a alteração para todos os clientes conectados, recalculando a fila de cada um
        io.sockets.sockets.forEach((sClient) => {
            sClient.emit('config_atualizada', {
                ...configAdminGlobal,
                meuTempoFila: calcularTempoFila(sClient.id)
            });
        });
    });

    // 2. Cliente clica para fazer o pedido e entra na fila dinâmica
    socket.on('fazer_pedido', () => {
        if (!filaPedidos.includes(socket.id)) {
            filaPedidos.push(socket.id);
            console.log(`> Novo pedido na fila. Posição atual na fila: ${filaPedidos.length}`);
        }

        // Atualiza o painel de todos para refletir o novo status de espera
        io.sockets.sockets.forEach((sClient) => {
            sClient.emit('config_atualizada', {
                ...configAdminGlobal,
                meuTempoFila: calcularTempoFila(sClient.id)
            });
        });
    });

    // 3. Desconexão do usuário
    socket.on('disconnect', () => {
        console.log(`< Desconectado: ${socket.id}`);
        // Remove da fila de pedidos caso estivesse participando
        filaPedidos = filaPedidos.filter(id => id !== socket.id);
    });
});

// Função para calcular o tempo de fila individual (quem chegou antes espera menos, quem chegou depois acumula atraso)
function calcularTempoFila(socketId) {
    const tempoBaseMinutos = 10;
    const indexNaFila = filaPedidos.indexOf(socketId);

    if (indexNaFila === -1) {
        // Se ainda não fez pedido, retorna o tempo base multiplicado pelo fator admin
        return Math.round(tempoBaseMinutos * configAdminGlobal.fatorFilaBase);
    } else {
        // Se já fez pedido, adiciona 3 minutos extras para cada pessoa que está na frente na fila
        const atrasoPorPosicao = indexNaFila * 3;
        return Math.round((tempoBaseMinutos + atrasoPorPosicao) * configAdminGlobal.fatorFilaBase);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
