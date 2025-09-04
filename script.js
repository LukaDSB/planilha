// script.js (Com modal de confirmação)

document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANTE !!! Cole aqui a URL do seu Script do Google
    const urlDoAppsScript = 'https://script.google.com/macros/s/AKfycbyE1c81_5vqBAyqDldLD-Wmt2dwltAd069BF5iocG3dNSZnSuNH3RcmsCyE1QarDtu_/exec';
    const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhE4V2L_52xRkUwNSzE3Ud-zptB4cyZrZhIlQkPqp3MPHBzkfwhmyPllZYmsdIUE1s8x23GQyv-vFp/pub?gid=0&single=true&output=csv';

    // Referências aos elementos do DOM
    const corpoTabela = document.getElementById('corpo-tabela');
    const spanFaturaAtual = document.getElementById('fatura-atual');
    const spanTotalGeral = document.getElementById('total-geral');
    const spanTotalRestante = document.getElementById('total-restante');
    const btnSalvar = document.getElementById('btn-salvar');
    const statusSalvamento = document.getElementById('status-salvamento');
    const formAdicionar = document.getElementById('form-adicionar-produto');
    const inputNomeProduto = document.getElementById('nome-produto');
    const inputValorParcela = document.getElementById('valor-parcela-novo');
    const inputTotalParcelas = document.getElementById('total-parcelas-novo');
    const statusAdicao = document.getElementById('status-adicao');
    const btnAdicionar = document.getElementById('btn-adicionar');
    
    // --- NOVOS ELEMENTOS DA MODAL ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalProdutoNome = document.getElementById('modal-produto-nome');
    const btnModalCancelar = document.getElementById('btn-modal-cancelar');
    const btnModalConfirmar = document.getElementById('btn-modal-confirmar');
    let produtoParaExcluir = null; // Variável para guardar a referência do produto a ser excluído

    const formatarMoeda = (valor) => {
        if (isNaN(valor)) return 'R$ 0,00';
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    async function carregarDadosDaPlanilha() {
        // ... (código igual ao anterior)
        try {
            const resposta = await fetch(`${urlPlanilha}&timestamp=${new Date().getTime()}`);
            if (!resposta.ok) throw new Error('Falha ao carregar os dados da planilha.');
            
            const dadosCSV = await resposta.text();
            const linhas = dadosCSV.trim().split('\n').slice(1);
            
            corpoTabela.innerHTML = ''; 

            linhas.forEach(linha => {
                const valores = linha.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (valores.length < 3) return;

                const produto = valores[0].replace(/"/g, '');
                const parcelaInfo = valores[1].replace(/"/g, '');
                const valorParcelaStr = valores[2].replace(/"/g, '');
                
                const valorLimpo = valorParcelaStr.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
                const valorParcelaNumerico = parseFloat(valorLimpo);

                if (isNaN(valorParcelaNumerico)) {
                    console.error('Falha ao converter valor:', produto);
                    return;
                }

                const [parcelasPagasAtual, totalParcelas] = parcelaInfo.split('/').map(Number);
                const totalProduto = valorParcelaNumerico * totalParcelas;

                const tr = document.createElement('tr');
                tr.className = 'item-produto';
                tr.dataset.produtoNome = produto;
                
                tr.innerHTML = `
                    <td>${produto}</td>
                    <td class="parcela-info">${parcelaInfo}</td>
                    <td class="valor-parcela" data-valor="${valorParcelaNumerico}">${formatarMoeda(valorParcelaNumerico)}</td>
                    <td class="valor-total-item">${formatarMoeda(totalProduto)}</td>
                    <td><input type="number" class="parcelas-pagas" min="0" max="${totalParcelas}" value="${parcelasPagasAtual}"></td>
                    <td><button class="buttonexc" data-produto-nome="${produto}">Excluir</button></td>
                `;
                corpoTabela.appendChild(tr);
            });

            adicionarListenersDeAcao();
            calcularTotais();

        } catch (error) {
            corpoTabela.innerHTML = `<tr><td colspan="6">Erro ao carregar dados: ${error.message}</td></tr>`;
            console.error(error);
        }
    }
    
    function calcularTotais() {
        // ... (código igual ao anterior)
        let faturaAtual = 0, totalGeral = 0, totalPago = 0;
        document.querySelectorAll('.item-produto').forEach(linha => {
            const valorParcela = parseFloat(linha.querySelector('.valor-parcela').dataset.valor);
            const inputPagas = linha.querySelector('.parcelas-pagas');
            const totalParcelas = parseInt(inputPagas.max);
            const parcelasPagas = parseInt(inputPagas.value) || 0;
            if (!isNaN(valorParcela)) {
                totalGeral += valorParcela * totalParcelas;
                totalPago += valorParcela * parcelasPagas;
                if (parcelasPagas < totalParcelas) {
                    faturaAtual += valorParcela;
                }
            }
        });
        spanFaturaAtual.textContent = formatarMoeda(faturaAtual);
        spanTotalGeral.textContent = formatarMoeda(totalGeral);
        spanTotalRestante.textContent = formatarMoeda(totalGeral - totalPago);
    };

    function adicionarListenersDeAcao() {
        document.querySelectorAll('.parcelas-pagas').forEach(input => {
            input.addEventListener('input', calcularTotais);
        });
        
        document.querySelectorAll('.buttonexc').forEach(button => {
            button.addEventListener('click', () => {
                // --- LÓGICA MODIFICADA PARA ABRIR A MODAL ---
                produtoParaExcluir = button.dataset.produtoNome; // Armazena o nome do produto
                modalProdutoNome.textContent = produtoParaExcluir; // Exibe o nome na modal
                modalOverlay.classList.remove('hidden'); // Mostra a modal
            });
        });
    }
    
    // --- FUNÇÃO PARA EXECUTAR A EXCLUSÃO ---
    async function executarExclusao() {
        if (!produtoParaExcluir) return;

        const payload = {
            action: 'delete',
            data: { nomeProduto: produtoParaExcluir }
        };

        const linhaParaExcluir = document.querySelector(`tr[data-produto-nome="${produtoParaExcluir}"]`);
        if (linhaParaExcluir) {
            linhaParaExcluir.style.opacity = '0.5';
            linhaParaExcluir.style.pointerEvents = 'none';
        }

        try {
            await fetch(urlDoAppsScript, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            setTimeout(() => carregarDadosDaPlanilha(), 1500);

        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Ocorreu um erro ao tentar excluir o produto.');
            if (linhaParaExcluir) {
                linhaParaExcluir.style.opacity = '1'; 
                linhaParaExcluir.style.pointerEvents = 'auto';
            }
        } finally {
            produtoParaExcluir = null; // Limpa a variável
        }
    }
    
    // --- LISTENERS DOS BOTÕES DA MODAL ---
    btnModalConfirmar.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        executarExclusao();
    });

    btnModalCancelar.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        produtoParaExcluir = null; // Limpa a variável
    });

    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.classList.add('hidden');
            produtoParaExcluir = null; // Limpa a variável
        }
    });

    // Lógica para Salvar Alterações (UPDATE) - Sem alterações
    btnSalvar.addEventListener('click', async () => {
        const dadosParaEnviar = Array.from(document.querySelectorAll('.item-produto')).map(linha => ({
            nomeProduto: linha.dataset.produtoNome,
            parcelasPagas: linha.querySelector('.parcelas-pagas').value
        }));
        
        const payload = { action: 'update', data: dadosParaEnviar };
        statusSalvamento.textContent = 'Salvando...';
        btnSalvar.disabled = true;

        try {
            await fetch(urlDoAppsScript, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            statusSalvamento.textContent = 'Salvo! Atualizando...';
            setTimeout(() => {
                statusSalvamento.textContent = '';
                carregarDadosDaPlanilha();
            }, 2000);
        } catch (error) {
            console.error('Erro ao salvar:', error);
            statusSalvamento.textContent = 'Erro ao salvar.';
        } finally {
            btnSalvar.disabled = false;
        }
    });

    // Lógica para Adicionar Produto (ADD) - Sem alterações
    formAdicionar.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novoProduto = {
            nomeProduto: inputNomeProduto.value.trim(),
            valorParcela: parseFloat(inputValorParcela.value),
            totalParcelas: parseInt(inputTotalParcelas.value)
        };
        
        if (!novoProduto.nomeProduto || isNaN(novoProduto.valorParcela) || isNaN(novoProduto.totalParcelas) || novoProduto.valorParcela <= 0 || novoProduto.totalParcelas <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const payload = { action: 'add', data: novoProduto };
        statusAdicao.textContent = 'Adicionando...';
        btnAdicionar.disabled = true;

        try {
            await fetch(urlDoAppsScript, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            statusAdicao.textContent = 'Produto adicionado!';
            formAdicionar.reset();
            setTimeout(() => {
                statusAdicao.textContent = '';
                carregarDadosDaPlanilha();
            }, 2000);
        } catch (error) {
            console.error('Erro ao adicionar:', error);
            statusAdicao.textContent = 'Erro ao adicionar.';
        } finally {
            btnAdicionar.disabled = false;
        }
    });

    carregarDadosDaPlanilha();
});