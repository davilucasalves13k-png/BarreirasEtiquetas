const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname)); // Serve o HTML nativamente pelo mesmo domínio

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    }
});

// Captura qualquer erro interno de handshake do Engine.IO (essencial para debug)
io.engine.on("connection_error", (err) => {
    console.log("--- ENGINE.IO CONNECTION ERROR ---");
    console.log("Código:", err.code);
    console.log("Mensagem:", err.message);
    console.log("Contexto:", err.context);
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
    console.log(`> Conectado com sucesso: ${socket.id}`);

    // Envia o estado atualizado para o cliente recém-conectado
    socket.emit('config_atualizada', {
        ...configAdminGlobal,
        meuTempoFila: calcularTempoFila(socket.id)
    });

    socket.on('alterar_config_admin', (novaConfig) => {
        configAdminGlobal = { ...configAdminGlobal, ...novaConfig };
        console.log('> Configuração global atualizada:', configAdminGlobal);

        // Dispara a atualização para todos os clientes conectados de forma segura
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
            console.log(`> Novo pedido na fila. Posição: ${filaPedidos.length}`);
        }

        // Atualiza a fila e as configs para todos os clientes conectados
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
        
        // Opcional: Se quiser recalcular a fila para quem ficou quando alguém sai, pode disparar um broadcast aqui se necessário.
    });
});

function calcularTempoFila(socketId) {
    const tempoBaseMinutos = 10;
    const indexNaFila = filaPedidos.indexOf(socketId);

    if (indexNaFila === -1) {
        return Math.round(tempoBaseMinutos * configAdminGlobal.fatorFilaBase);
    } else {
        const atrasoPorPosicao = indexNaFila * 3;
        return Math.round((tempoBaseMinutos + atrasoPorPosicao) * configAdminGlobal.fatorFilaBase);
    }
}

// Porta dinâmica obrigatória para Render, Railway, Heroku, etc.
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
