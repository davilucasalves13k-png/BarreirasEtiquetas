const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname)); // <-- Crucial para o celular carregar o HTML direto do servidor

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Estado global do painel
let configAdminGlobal = {
    descontoGlobal: 0,
    freteGratis: 'nao',
    fatorFilaBase: 1,
    modoCupomExtra: 'nenhum',
    taxaFixaFrete: 15.00
};

let filaPedidos = [];

io.on('connection', (socket) => {
    console.log(`> Conectado: ${socket.id}`);

    // Envia o estado atual assim que conecta
    socket.emit('config_atualizada', {
        ...configAdminGlobal,
        meuTempoFila: calcularTempoFila(socket.id)
    });

    socket.on('alterar_config_admin', (novaConfig) => {
        configAdminGlobal = { ...configAdminGlobal, ...novaConfig };
        console.log('> Config atualizada:', configAdminGlobal);

        // Atualiza todo mundo
        io.sockets.sockets.forEach((sClient) => {
            sClient.emit('config_atualizada', {
                ...configAdminGlobal,
                meuTempoFila: calcularTempoFila(sClient.id)
            });
        });
    });

    socket.on('fazer_pedido', () => {
        if (!filaPedidos.includes(socket.id)) {
            filaPedidos.push(socket.id);
        }
        io.sockets.sockets.forEach((sClient) => {
            sClient.emit('config_atualizada', {
                ...configAdminGlobal,
                meuTempoFila: calcularTempoFila(sClient.id)
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`< Desconectado: ${socket.id}`);
        filaPedidos = filaPedidos.filter(id => id !== socket.id);
    });
});

function calcularTempoFila(socketId) {
    const tempoBase = 10;
    const index = filaPedidos.indexOf(socketId);
    if (index === -1) return Math.round(tempoBase * configAdminGlobal.fatorFilaBase);
    return Math.round((tempoBase + (index * 3)) * configAdminGlobal.fatorFilaBase);
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
