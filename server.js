const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// HTML Completo injetado diretamente no servidor com Socket.io ativado no front-end
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barreiras Pagamentos & Etiquetas - Tempo Real</title>
    <!-- Socket.io Client -->
    <script src="/socket.io/socket.io.js"></script>
    <style>
        :root { --primary: #0056b3; --success: #28a745; --bg: #f4f7f6; }
        body { font-family: Arial, sans-serif; background: var(--bg); margin: 0; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1, h2 { color: var(--primary); }
        .tab-menu { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        .tab-btn { background: #ddd; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; }
        .tab-btn.active { background: var(--primary); color: #fff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .card { background: #fafafa; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
        input, select { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background: var(--success); color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; width: 100%; }
        button:hover { opacity: 0.9; }
        .badge { background: #ffc107; color: #000; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .auto-save-status { font-size: 11px; color: #666; float: right; margin-top: 5px; }
    </style>
</head>
<body>

<div class="container">
    <h1>Barreiras Pagamentos & Etiquetas</h1>
    <span id="saveStatus" class="auto-save-status">Salvando automaticamente...</span>
    
    <div class="tab-menu">
        <button class="tab-btn active" onclick="switchTab('painel')">Painel & Entrega</button>
        <button class="tab-btn" onclick="switchTab('cartoes')">Cartões & Pagamento</button>
        <button class="tab-btn" onclick="switchTab('webcredito')">Web Crédito</button>
        <button class="tab-btn" onclick="switchTab('loja')">Loja (Comprar Limite)</button>
    </div>

    <div id="painel" class="tab-content active">
        <h2>Painel de Pedidos e Prazos</h2>
        <div class="card">
            <p><strong>Item:</strong> Bobinas de Papel + Papel Hambúrguer (Primeira Compra c/ Arte: +R$ 20)</p>
            <p><strong>Prazo de Chegada Dinâmico:</strong> <span id="countdownDisplay" class="badge">Calculando...</span></p>
        </div>
    </div>

    <div id="cartoes" class="tab-content">
        <h2>Gerenciar Cartões</h2>
        <div class="card">
            <h3>Registrar Cartão de Débito</h3>
            <input type="text" id="nomeTitular" placeholder="Nome no Cartão" oninput="autoSave()">
            <input type="text" id="numCartao" placeholder="Número do Cartão" oninput="autoSave()">
            <button onclick="registrarCartao()">Salvar Cartão</button>
        </div>
        <div class="card">
            <h3>Pagamento Inteligente (Foto ou Crédito/Débito)</h3>
            <p>Selecione a forma de pagamento ou envie a foto do cartão para auto-identificação:</p>
            <select id="tipoPagamento" onchange="autoSave()">
                <option value="credito">Cartão de Crédito</option>
                <option value="debito">Cartão de Débito Registrado</option>
            </select>
            <input type="file" id="fotoCartao" accept="image/*" onchange="simularLeituraFoto()">
            <button onclick="realizarPagamento()">Pagar Pedido</button>
        </div>
    </div>

    <div id="webcredito" class="tab-content">
        <h2>Web Crédito</h2>
        <div class="card">
            <p>Seu Limite Atual:</p>
            <h1 id="displayLimite">R$ 1.000,00</h1>
            <p>Use seu Web Crédito para insumos de mercado, bobinas e papéis personalizados.</p>
        </div>
    </div>

    <div id="loja" class="tab-content">
        <h2>Loja de Expansão de Limite</h2>
        <p>Precisa de mais poder de compra para seus estoques de embalagens?</p>
        <div class="card">
            <h3>Pacote +R$ 1.000,00 de Limite</h3>
            <p>Preço: <strong>R$ 30,00</strong></p>
            <button style="background: var(--primary);" onclick="comprarLimite()">Comprar Mais Limite</button>
        </div>
    </div>
</div>

<script>
    const socket = io();

    let appState = {
        limiteWebCredito: 1000.00,
        cartaoRegistrado: false,
        titular: "",
        cartao: "",
        dataEntregaAlvo: new Date(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000) 
    };

    window.onload = function() {
        const saved = localStorage.getItem('barreiras_state');
        if(saved) {
            appState = JSON.parse(saved);
            appState.dataEntregaAlvo = new Date(appState.dataEntregaAlvo);
            document.getElementById('numCartao').value = appState.cartao || '';
            document.getElementById('nomeTitular').value = appState.titular || '';
        }
        atualizarInterface();
        setInterval(atualizarPrazoInteligente, 1000);
    };

    // Socket.io escutando atualizações em tempo real de outros dispositivos
    socket.on('state_updated', function(incomingState) {
        appState.limiteWebCredito = incomingState.limiteWebCredito;
        appState.titular = incomingState.titular;
        appState.cartao = incomingState.cartao;
        document.getElementById('numCartao').value = appState.cartao;
        document.getElementById('nomeTitular').value = appState.titular;
        atualizarInterface();
    });

    function autoSave() {
        appState.titular = document.getElementById('nomeTitular').value;
        appState.cartao = document.getElementById('numCartao').value;
        
        localStorage.setItem('barreiras_state', JSON.stringify(appState));
        
        // Envia dados para o Socket.io sincronizar em tempo real
        socket.emit('update_state', appState);

        const status = document.getElementById('saveStatus');
        status.innerText = "Salvo automaticamente!";
        setTimeout(() => { status.innerText = ""; }, 2000);
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        event.currentTarget.classList.add('active');
    }

    function atualizarPrazoInteligente() {
        const agora = new Date();
        const diffMs = appState.dataEntregaAlvo - agora;

        if (diffMs <= 0) {
            document.getElementById('countdownDisplay').innerText = "Pedido Entregue!";
            return;
        }

        const segundos = Math.floor(diffMs / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        const anos = Math.floor(dias / 365);

        let textoPrazo = "";
        if (anos > 0) {
            const diasRestantes = dias % 365;
            textoPrazo = anos + " ano(s) e " + diasRestantes + " dia(s)";
        } else if (dias > 0) {
            const horasRestantes = horas % 24;
            textoPrazo = dias + " dia(s) e " + horasRestantes + "h";
        } else if (horas > 0) {
            const minsRestantes = minutos % 60;
            textoPrazo = horas + "h e " + minsRestantes + " min";
        } else {
            textoPrazo = minutos + " minutos";
        }

        document.getElementById('countdownDisplay').innerText = textoPrazo;
    }

    function simularLeituraFoto() {
        const fileInput = document.getElementById('fotoCartao');
        if (fileInput.files && fileInput.files[0]) {
            setTimeout(() => {
                document.getElementById('numCartao').value = "**** **** **** 8899";
                document.getElementById('nomeTitular').value = "CLIENTE IDENTIFICADO VIA FOTO";
                autoSave();
                alert("Cartão identificado e preenchido automaticamente pela foto com sucesso!");
            }, 1000);
        }
    }

    function registrarCartao() {
        appState.cartaoRegistrado = true;
        autoSave();
        alert("Cartão de débito registrado com sucesso!");
    }

    function realizarPagamento() {
        const tipo = document.getElementById('tipoPagamento').value;
        alert("Pagamento processado com sucesso via " + tipo.toUpperCase() + "!");
    }

    function comprarLimite() {
        appState.limiteWebCredito += 1000.00;
        autoSave();
        atualizarInterface();
        alert("Parabéns! +R$ 1.000,00 adicionados ao seu Web Crédito.");
    }

    function atualizarInterface() {
        document.getElementById('displayLimite').innerText = "R$ " + appState.limiteWebCredito.toLocaleString('pt-BR', {minFractionDigits: 2});
    }
</script>

</body>
</html>`;

// Rota principal que entrega o HTML
app.get('/', (req, res) => {
    res.send(htmlContent);
});

// Configuração do Socket.io no servidor
io.on('connection', (socket) => {
    console.log(`> Novo usuário conectado via Socket.io: ${socket.id}`);

    socket.on('update_state', (data) => {
        // Transmite a alteração para os outros clientes conectados em tempo real
        socket.broadcast.emit('state_updated', data);
    });

    socket.on('disconnect', () => {
        console.log(`< Usuário desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`> Servidor com Socket.io rodando na porta ${PORT}`);
});
