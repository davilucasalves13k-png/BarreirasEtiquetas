const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos estáticos (HTML, CSS, JS do front-end) da mesma pasta
app.use(express.static(__dirname));

// Gerenciamento de conexões em tempo real via Socket.io
io.on('connection', (socket) => {
    console.log(`> Novo cliente conectado: ${socket.id}`);

    // Ouve atualizações de estado enviadas pelo front-end e retransmite se necessário
    socket.on('update_state', (data) => {
        // Envia a atualização para todos os outros dispositivos conectados
        socket.broadcast.emit('state_updated', data);
    });

    socket.on('disconnect', () => {
        console.log(`< Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`> Servidor rodando com sucesso na porta ${PORT}`);
    console.log(`> Acesse localmente em: http://localhost:${PORT}`);
});
