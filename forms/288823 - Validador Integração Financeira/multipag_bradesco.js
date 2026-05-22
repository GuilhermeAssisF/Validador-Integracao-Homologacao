// ============================================================
// VALIDADOR BANCÁRIO - RELATÓRIO MULTIPAG (STANDALONE)
// ============================================================
window.MultipagBradesco = (function () {

    var dicionarioOcorrencias = {
        "00": "Débito Efetivado",
        "01": "Insufic. Fundos - Débito Não Efetuado",
        "02": "Crédito ou Débito Cancelado",
        "03": "Débito Autorizado Efetuado",
        "BD": "Inclusão Efetuada com Sucesso",
        "HA": "Lote Não Aceito",
        "TA": "Lote Não Aceito - Diferença Totais"
    };

    var padRight = function (texto, tamanho) {
        texto = (texto || "").toString();
        while (texto.length < tamanho) { texto += " "; }
        return texto.substring(0, tamanho);
    };

    var processarDados = function (conteudoArquivo) {
        var linhas = conteudoArquivo.split(/\r?\n/).filter(function (l) { return l.trim().length > 0 });
        if (linhas.length < 1) return null;

        var linha1 = linhas[0];
        if (linha1.charAt(7) !== '0') return null;

        // Cabeçalho (Registro 0)
        var header = {
            cnpj: linha1.substring(17, 32).trim().replace(/^0+/, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
            convenio: linha1.substring(32, 52).trim(),
            agencia: linha1.substring(52, 57).trim() + "-" + linha1.substring(57, 58).trim(),
            conta: linha1.substring(58, 70).replace(/^0+/, "") + "-" + linha1.substring(70, 71).trim(),
            empresa: linha1.substring(72, 102).trim(),
            dataRetorno: linha1.substring(143, 151).replace(/(\d{2})(\d{2})(\d{4})/, "$1/$2/$3"),
            horaRetorno: linha1.substring(151, 157).replace(/(\d{2})(\d{2})(\d{2})/, "$1:$2:$3"),
            lotes: []
        };

        var loteAtual = null;
        var transacaoAtual = null;

        // Processa as linhas (Registros 1, 3 e 9)
        for (var i = 0; i < linhas.length; i++) {
            var linha = linhas[i];
            var tipoRegistro = linha.charAt(7);

            if (tipoRegistro === '1') {
                var servicoCod = linha.substring(9, 11);
                var descServ = (servicoCod === "30") ? "Pagamento Salários" : "Pagamentos Diversos";
                var formaLancCod = linha.substring(11, 13);
                var descForma = (formaLancCod === "01") ? "Crédito em Conta Corrente" : formaLancCod;

                loteAtual = {
                    numero: linha.substring(3, 7),
                    servico: servicoCod + " - " + descServ,
                    forma: formaLancCod + " - " + descForma,
                    transacoes: [],
                    totalLote: 0
                };
                header.lotes.push(loteAtual);
            }
            else if (tipoRegistro === '3') {
                var segmento = linha.charAt(13);

                if (segmento === 'A') {
                    var ocorrenciaCod = linha.substring(230, 232).trim();
                    var ocorrenciaDesc = dicionarioOcorrencias[ocorrenciaCod] || ocorrenciaCod;
                    var vlrFloat = parseFloat(linha.substring(119, 134)) / 100;

                    transacaoAtual = {
                        lote: linha.substring(3, 7),
                        bancoFav: linha.substring(20, 23).trim(),
                        agFav: linha.substring(23, 28).trim() + "-" + linha.substring(28, 29).trim(),
                        ccFav: linha.substring(29, 41).replace(/^0+/, "") + "-" + linha.substring(41, 42).trim(),
                        nomeFav: linha.substring(43, 73).trim(),
                        documento: linha.substring(73, 93).trim(),
                        dataPgto: linha.substring(93, 101).replace(/(\d{2})(\d{2})(\d{4})/, "$1/$2/$3"),
                        valorStr: vlrFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        ocorrencia: ocorrenciaCod + " - " + ocorrenciaDesc,
                        cpf: ""
                    };

                    if (loteAtual) {
                        loteAtual.transacoes.push(transacaoAtual);
                        loteAtual.totalLote += vlrFloat;
                    }
                }
                else if (segmento === 'B' && transacaoAtual) {
                    var docLimpo = linha.substring(18, 32).trim().replace(/^0+/, "");
                    if (docLimpo.length === 11) {
                        docLimpo = docLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                    }
                    transacaoAtual.cpf = docLimpo;
                }
            }
        }
        return header;
    };

    // Substitua a função gerarEExibir por esta:
    var renderizarNaTela = function (conteudoArquivo) {
        var dados = processarDados(conteudoArquivo);

        if (!dados) {
            $("#painel_multipag_inline").hide().empty();
            return;
        }

        // Constrói o texto do relatório (Mantido igual)
        var txt = "Monitoração de Arquivos Retorno\n\nMULTIPAG\n\n";
        txt += "CPF/CNPJ: " + dados.cnpj + "\n";
        txt += "Código do convênio/Perfil: " + dados.convenio + "\n";
        txt += "Agência: " + dados.agencia + "\n";
        txt += "Conta-corrente: " + dados.conta + "\n";
        txt += "Nome da empresa: " + dados.empresa + "\n";
        txt += "Data de retorno: " + dados.dataRetorno + "\n";
        txt += "Hora de retorno: " + dados.horaRetorno + "\n\n";
        txt += "Lotes no arquivo:\n\n";

        dados.lotes.forEach(function (lote) {
            txt += "CNPJ " + dados.cnpj + " Contrato " + dados.convenio + " Ag/Cc " + dados.agencia + " " + dados.conta + "\n";
            txt += lote.servico + "\n";
            txt += lote.forma + "\n";
            var totalFormatado = lote.totalLote.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            txt += "Total do lote nº " + lote.numero + ": R$ " + totalFormatado + "\n\n";

            txt += "Segmento A\n";
            txt += padRight("Lote", 6) + padRight("Tipo de serviço/pgto", 26) + padRight("Movimento", 11) + padRight("Situação", 22) + padRight("Processamento", 19) + padRight("Banco", 6) + padRight("Agência", 9) + padRight("Conta", 15) + padRight("Favorecido", 39) + padRight("Documento", 17) + padRight("Dt Pgto", 11) + padRight("Vlr Pgto", 23) + "Ocorrências\n";
            txt += "========================================================================================================================================================================================================================\n\n";

            lote.transacoes.forEach(function (t) {
                txt += padRight(t.lote, 6) + padRight("TED/DOC/Crédito em conta", 26) + padRight("Inclusão", 11) + padRight("Liberado", 22) + padRight("Transf entre Cc.", 19);
                txt += padRight(t.bancoFav, 6) + padRight(t.agFav, 9) + padRight(t.ccFav, 15) + padRight(t.nomeFav, 39);
                txt += padRight(t.documento, 17) + padRight(t.dataPgto, 11) + padRight(t.valorStr, 23) + t.ocorrencia + "\n";
                txt += padRight("", 114) + "CPF do favorecido " + t.cpf + "\n";
            });
            txt += "========================================================================================================================================================================================================================\n\n";
        });

        // Constrói o HTML fixo do Painel (Sem Modal)
        var htmlPainel = '<div class="panel panel-default" style="border: 1px solid #1181c2;">';
        htmlPainel += '  <div class="panel-heading" style="background-color: #1181c2; color: white;">';
        htmlPainel += '    <h3 class="panel-title"><i class="flaticon flaticon-text-format icon-sm"></i> <b>Relatório Multipag Bradesco</b> (Validação Interna)</h3>';
        htmlPainel += '  </div>';
        htmlPainel += '  <div class="panel-body" style="padding: 0;">';
        htmlPainel += '    <pre style="background: #fcfdfd; padding: 15px; border: none; margin: 0; font-size: 12px; font-family: \'Courier New\', Courier, monospace; overflow-x: auto; max-height: 400px;">' + txt + '</pre>';
        htmlPainel += '  </div>';
        htmlPainel += '</div>';

        // Injeta na tela e exibe com animação
        $("#painel_multipag_inline").html(htmlPainel).slideDown();
    };

    return {
        renderizarNaTela: renderizarNaTela
    };
})();