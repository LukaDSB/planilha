document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANTE !!! Cole aqui a URL do seu Script do Google
    const urlDoAppsScript = 'https://script.google.com/macros/s/AKfycbyAojRAVi3Xrm0Av3-x_M38bvUw27oLCKqVQOxmA6zAQYhP479UFEa2OHMlAB-C-Tql/exec';
    const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhE4V2L_52xRkUwNSzE3Ud-zptB4cyZrZhIlQkPqp3MPHBzkfwhmyPllZYmsdIUE1s8x23GQyv-vFp/pub?gid=0&single=true&output=csv';

    // --- NOVA VARIÁVEL ADICIONADA AQUI ---
    const corpoTabela = document.getElementById('corpo-tabela');
    const spanFaturaAtual = document.getElementById('fatura-atual'); // Novo
    const spanTotalGeral = document.getElementById('total-geral');
    const spanTotalRestante = document.getElementById('total-restante');
    const btnSalvar = document.getElementById('btn-salvar');
    const statusSalvamento = document.getElementById('status-salvamento');

    const formatarMoeda = (valor) => {
        if (isNaN(valor)) {
            return 'R$ 0,00';
        }
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    async function carregarDadosDaPlanilha() {
        try {
            const resposta = await fetch(urlPlanilha);
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
                
                const valorLimpo = valorParcelaStr.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
                const valorParcelaNumerico = parseFloat(valorLimpo);

                if (isNaN(valorParcelaNumerico)) {
                    console.error('Falha ao converter valor para o produto:', produto, 'Valor original:', valorParcelaStr);
                    return;
                }

                const totalParcelas = parseInt(parcelaInfo.split('/')[1]);
                const parcelasPagasAtual = parseInt(parcelaInfo.split('/')[0]);
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
                `;
                corpoTabela.appendChild(tr);
            });

            adicionarListenersECalcular();
        } catch (error) {
            corpoTabela.innerHTML = `<tr><td colspan="5">Erro ao carregar dados: ${error.message}</td></tr>`;
            console.error(error);
        }
    }
    
    // --- FUNÇÃO ATUALIZADA ---
    function adicionarListenersECalcular() {
        const todosInputs = document.querySelectorAll('.parcelas-pagas');
        
        const calcularTotais = () => {
            let faturaAtual = 0; // Nova variável para o cálculo
            let totalGeral = 0;
            let totalPago = 0;

            document.querySelectorAll('.item-produto').forEach(linha => {
                const valorParcela = parseFloat(linha.querySelector('.valor-parcela').dataset.valor);
                const inputPagas = linha.querySelector('.parcelas-pagas');
                const totalParcelas = parseInt(inputPagas.max);
                const parcelasPagas = parseInt(inputPagas.value) || 0;

                if (!isNaN(valorParcela) && !isNaN(totalParcelas) && !isNaN(parcelasPagas)) {
                    totalGeral += valorParcela * totalParcelas;
                    totalPago += valorParcela * parcelasPagas;
                    
                    // Condição para somar à fatura atual:
                    // Se as parcelas pagas forem menores que o total, o item está ativo
                    if (parcelasPagas < totalParcelas) {
                        faturaAtual += valorParcela;
                    }
                }
            });

            const totalRestante = totalGeral - totalPago;
            
            // Atualiza todos os valores na tela
            spanFaturaAtual.textContent = formatarMoeda(faturaAtual); // Novo
            spanTotalGeral.textContent = formatarMoeda(totalGeral);
            spanTotalRestante.textContent = formatarMoeda(totalRestante);
        };
        
        todosInputs.forEach(input => {
            input.addEventListener('input', calcularTotais);
        });

        calcularTotais();
    }
    
    btnSalvar.addEventListener('click', async () => {
        if (urlDoAppsScript === 'URL_DO_SEU_SCRIPT_AQUI' || !urlDoAppsScript) {
            alert('Erro: A URL do Google Apps Script não foi configurada no arquivo script.js.');
            return;
        }

        const dadosParaEnviar = [];
        document.querySelectorAll('.item-produto').forEach(linha => {
            const nomeProduto = linha.dataset.produtoNome;
            const parcelasPagas = linha.querySelector('.parcelas-pagas').value;
            dadosParaEnviar.push({ nomeProduto, parcelasPagas });
        });

        statusSalvamento.textContent = 'Salvando...';
        btnSalvar.disabled = true;

        try {
            await fetch(urlDoAppsScript, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar)
            });

            statusSalvamento.textContent = 'Enviado! Atualizando...';
            setTimeout(() => {
                statusSalvamento.textContent = '';
                carregarDadosDaPlanilha();
            }, 2000);

        } catch (error) {
            console.error('Erro ao salvar:', error);
            statusSalvamento.textContent = `Erro ao enviar. Verifique o console.`;
        } finally {
            btnSalvar.disabled = false;
        }
    });

    carregarDadosDaPlanilha();
});