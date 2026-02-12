// =================================================================================
// INÍCIO DO SCRIPT PRINCIPAL
// =================================================================================
$(document).ready(function () {

    // CHAMA REPINTURA SEMPRE QUE CARREGAR (Para garantir visualização correta dos dados salvos)
    repintarInterface();

    // 1. DETECÇÃO DE CONTEXTO: ESTAMOS NA ATIVIDADE DE ENVIO (12)?
    var isAtividadeEnvio = $("#painel_email_rh").is(":visible");

    if (isAtividadeEnvio) {
        console.log(">>> Modo Envio Financeiro (Task 12) Detectado <<<");

        // A. BLINDAGEM DE INTERFACE
        $("#painel_info, #row_guia_header, #painel_leitura, #painel_erp, #painel_rateio").hide();
        $("#painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia").hide();
        $("#campos_originais_cnab, #row_cnab_inputs, #painel_resumo").hide();

        $("#btn_copiar_anexo").show();

        // B. GERAÇÃO AUTOMÁTICA DE E-MAIL
        setTimeout(function () {
            gerarTextoEmail();
        }, 500);

    } else {
        // =========================================================================
        // COMPORTAMENTO PADRÃO (INÍCIO, CORREÇÃO, ANÁLISE)
        // =========================================================================

        // 2. MONITORAMENTO DE TIPO DE DOCUMENTO
        $("#tipo_documento").change(function () {
            ajustarInterfacePorTipo($(this).val());
            controlarBotaoUpload(); // Garante o bloqueio/desbloqueio correto
            limparCamposFinanceiros();
        });

        // Executa ajuste inicial ao carregar a página (SEM LIMPAR DADOS)
        ajustarInterfacePorTipo($("#tipo_documento").val());
        controlarBotaoUpload(); // Bloqueia anexo se banco não estiver selecionado

        $("#btn_upload_cnab").click(function () {
            if ($("#tipo_documento").val() == "cnab" && !$("#cod_banco").val()) {
                FLUIGC.toast({ title: 'Atenção', message: 'Selecione o Banco antes de anexar o arquivo.', type: 'warning' });
                return;
            }
            $("#fileUpload").click(); // Dispara o input file oculto
        });

        // 3. RESTAURAÇÃO DE LÓGICA DE VALIDAÇÃO (Se dados já existem)
        if ($("#erp_id_lan").val() && $("#erp_historico").val()) {
            // Apenas revalida se não tiver status já salvo, ou para garantir integridade
            if(!$("#chk_valor").val()) {
                console.log("Dados encontrados. Executando validação...");
                validarDivergencias();
            }
        }

        // 4. EVENTOS DE GUIA
        $("#guia_valor_total, #guia_data_venc").on("blur change", function () {
            atualizarResumoGuia();
        });

        // 5. EVENTOS GERAIS
        $("#txt_justificativa").on("blur", function () {
            gerarTextoEmail();
        });

        // 6. MONITORAMENTO DO ID LAN (COM VERIFICAÇÃO DE DUPLICIDADE)
        $("#erp_id_lan").off("blur").on("blur", function () {
            var idDigitado = $(this).val();
            var coligada = $("#cod_empresa").val();

            if (idDigitado && idDigitado.trim() !== "") {
                if (coligada) {
                    verificarDisponibilidadeID(coligada, idDigitado);
                } else {
                    FLUIGC.toast({ title: 'Atenção', message: 'Selecione a empresa antes de digitar o ID LAN.', type: 'warning' });
                    $(this).val("");
                }
            } else {
                limparCamposFinanceiros();
            }
        });

        $("#erp_id_lan").on("keypress", function (e) {
            if (e.which == 13) {
                e.preventDefault();
                $(this).blur();
            }
        });

        // 7. CARGA DE CARD GUIA (Se houver cards salvos, atualiza o resumo)
        if ($("input[name^='card_id_lan___']").length > 0) {
            atualizarResumoGuia();
        }
    }

});

// =================================================================================
// FUNÇÃO DE REPINTURA (RECUPERA CORES BASEADO NO VALOR PERSISTIDO)
// =================================================================================
function repintarInterface() {
    // 1. Repintura CNAB
    var camposCheck = ['chk_empresa', 'chk_cnpj', 'chk_banco', 'chk_data_cred', 'chk_valor'];
    
    $.each(camposCheck, function(i, nomeCampo) {
        var input = $("input[name='" + nomeCampo + "']");
        var valor = input.val();
        var msgInput = $("input[name='" + nomeCampo.replace('chk_', 'msg_') + "']"); // Recupera input de mensagem

        if(valor == "OK") {
            aplicarEstiloCampo(input, "green");
            msgInput.css("color", "green").css("font-weight", "bold");
        } else if (valor == "DIVERGENTE" || valor == "ERRO") {
            aplicarEstiloCampo(input, "red");
            msgInput.css("color", "red").css("font-weight", "bold");
        } else if (valor == "ATENÇÃO" || valor == "PENDENTE") {
            aplicarEstiloCampo(input, "#d8b100");
            msgInput.css("color", "#8a6d3b");
        }
    });

    // 2. Repintura Guia
    var statusGuiaValor = $("#status_guia_valor").val();
    if(statusGuiaValor == "OK") {
        aplicarEstiloCampo($("#status_guia_valor"), "green");
        $("#detalhe_guia_valor").css("color", "green");
    } else if(statusGuiaValor == "DIVERGENTE") {
        aplicarEstiloCampo($("#status_guia_valor"), "red");
        $("#detalhe_guia_valor").css("color", "red");
    }

    var statusGuiaData = $("#status_guia_data").val();
    if(statusGuiaData == "OK") {
        aplicarEstiloCampo($("#status_guia_data"), "green");
        $("#detalhe_guia_data").css("color", "green");
    } else if(statusGuiaData == "DIVERGENTE") {
        aplicarEstiloCampo($("#status_guia_data"), "red");
        $("#detalhe_guia_data").css("color", "red");
    }
}

// =================================================================================
// HELPERS (Auxiliares)
// =================================================================================

function getLoginUsuario() {
    try { return window.parent.WCMAPI.userLogin; } catch (e) { return ""; }
}

function getUserCode() {
    try { return window.parent.WCMAPI.userCode; } catch (e) { return ""; }
}

function limparCaracteres(valor) {
    if (!valor) return "";
    return valor.replace(/[\.\-\/]/g, "").trim();
}

function extrairNome(valor) {
    if (!valor) return "";
    if (valor.indexOf(" - ") > -1) {
        return valor.split(" - ")[1].trim();
    }
    return valor.trim();
}

function formatarDataISO(dataISO) {
    if (!dataISO) return "";
    var dataLimpa = dataISO.substring(0, 10);
    var partes = dataLimpa.split("-"); 
    if (partes.length === 3) {
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }
    return dataISO;
}

function formatarValorMonetario(valor) {
    if (!valor) return "0,00";
    var numero = parseFloat(valor);
    if (isNaN(numero)) return "0,00";
    return numero.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

// =================================================================================
// 1. LÓGICA DE VALIDAÇÃO
// =================================================================================

function validarDivergencias() {
    console.log("Executando validação cruzada...");

    function apenasNumeros(str) {
        if (!str) return "";
        var partes = str.toString().split("-");
        return partes[0].replace(/[^0-9]/g, "");
    }

    // --- 1. CAPTURA DOS VALORES ---
    var reqEmpresa = extrairNome($("#txt_empresa").val());
    var reqCnpj = limparCaracteres($("#txt_cnpj").val());
    var reqBancoCod = apenasNumeros($("#cod_banco").val());

    var arqEmpresa = extrairNome($("#arq_empresa").val());
    var arqCnpj = limparCaracteres($("#arq_cnpj").val());
    var arqBancoCod = apenasNumeros($("#arq_banco").val());

    var arqValor = $("#arq_valor").val();
    var arqData = $("#arq_data_cred").val();

    var erpEmpresa = extrairNome($("#erp_empresa").val());
    var erpCnpj = limparCaracteres($("#erp_cnpj").val());
    var erpBancoCod = apenasNumeros($("#erp_banco").val());

    var erpValor = $("#erp_valor").val();
    var erpData = $("#erp_data_cred").val();

    // --- 2. REGRAS DE COMPARAÇÃO ---

    // A. EMPRESA
    var statusEmpresa = "PENDENTE";
    var msgEmpresa = "Aguardando preenchimento.";
    var corEmpresa = "black";

    if (reqEmpresa && arqEmpresa && erpEmpresa) {
        var nomeOk = (reqEmpresa.toUpperCase() === arqEmpresa.toUpperCase() && arqEmpresa.toUpperCase() === erpEmpresa.toUpperCase());

        if (nomeOk) {
            statusEmpresa = "OK";
            msgEmpresa = "Razão Social confere.";
            corEmpresa = "green";
        } else {
            statusEmpresa = "ATENÇÃO";
            msgEmpresa = "Nomes divergentes (verifique visualmente).";
            corEmpresa = "#d8b100";
        }
    }

    // B. CNPJ
    var statusCnpj = "PENDENTE";
    var msgCnpj = "";
    var corCnpj = "black";

    if (reqCnpj && arqCnpj && erpCnpj) {
        var cnpjOk = (reqCnpj === arqCnpj && arqCnpj === erpCnpj);
        if (cnpjOk) {
            statusCnpj = "OK";
            msgCnpj = "CNPJ confere nos 3 painéis.";
            corCnpj = "green";
        } else {
            statusCnpj = "ERRO";
            msgCnpj = "Divergência de CNPJ.";
            corCnpj = "red";
        }
    }

    // C. BANCO
    var statusBanco = "PENDENTE";
    var msgBanco = "";
    var corBanco = "black";

    if (reqBancoCod && arqBancoCod && erpBancoCod) {
        if (reqBancoCod === arqBancoCod && arqBancoCod === erpBancoCod) {
            statusBanco = "OK";
            msgBanco = "Cód. Banco (" + reqBancoCod + ") confere nos 3 painéis.";
            corBanco = "green";
        } else {
            statusBanco = "ATENÇÃO";
            msgBanco = "Divergência: Solicit(" + reqBancoCod + ") x Arq(" + arqBancoCod + ") x ERP(" + erpBancoCod + ")";
            corBanco = "#d8b100";
        }
    }
    else if (reqBancoCod && arqBancoCod) {
        if (reqBancoCod === arqBancoCod) {
            statusBanco = "PENDENTE";
            msgBanco = "Falta o Banco no Quadro Contas a Pagar (Verifique o ERP).";
            corBanco = "#d8b100";
        } else {
            statusBanco = "ATENÇÃO";
            msgBanco = "Divergência: Solicit(" + reqBancoCod + ") x Arq(" + arqBancoCod + ")";
            corBanco = "#d8b100";
        }
    }

    // D. VALOR
    var statusValor = "PENDENTE";
    if (arqValor && erpValor) {
        statusValor = (arqValor === erpValor) ? "OK" : "ERRO";
    }

    // E. DATA
    var statusData = "PENDENTE";
    if (arqData && erpData) {
        statusData = (arqData === erpData) ? "OK" : "ERRO";
    }

    // --- 3. ATUALIZAÇÃO VISUAL E PERSISTÊNCIA ---

    atualizarLinhaValidacao("chk_empresa", "msg_empresa", statusEmpresa, msgEmpresa, corEmpresa);
    atualizarLinhaValidacao("chk_cnpj", "msg_cnpj", statusCnpj, msgCnpj, corCnpj);
    atualizarLinhaValidacao("chk_banco", "msg_banco", statusBanco, msgBanco, corBanco);
    atualizarLinhaValidacao("chk_valor", "msg_valor", statusValor, (statusValor == "ERRO" ? "Valores Diferentes" : "Valores Iguais"), (statusValor == "OK" ? "green" : statusValor == "ERRO" ? "red" : "black"));
    atualizarLinhaValidacao("chk_data_cred", "msg_data_cred", statusData, (statusData == "ERRO" ? "Datas Diferentes" : "Datas Iguais"), (statusData == "OK" ? "green" : statusData == "ERRO" ? "red" : "black"));

    // Lógica Final de Divergência
    if (statusBanco === "OK" && statusValor === "OK" && statusData === "OK") {
        if (statusEmpresa === "OK") {
            $("#cpTemDivergencia").val("nao");
        } else if (statusEmpresa === "ATENÇÃO") {
            $("#cpTemDivergencia").val("aviso");
        } else {
            $("#cpTemDivergencia").val("sim");
        }
    } else {
        $("#cpTemDivergencia").val("sim"); 
    }

    if (typeof gerarTextoEmail === 'function') gerarTextoEmail();
}

function atualizarLinhaValidacao(idInput, idMsg, valor, mensagem, cor) {
    // 1. Grava o status (OK/ERRO) e aplica cor visualmente
    var inputStatus = $("[name='" + idInput + "']");
    inputStatus.val(valor);
    aplicarEstiloCampo(inputStatus, cor);

    // 2. GRAVA A MENSAGEM NO NOVO INPUT (Isso garante a persistência)
    var inputMsg = $("[name='" + idMsg + "']");
    inputMsg.val(mensagem);
    
    // Aplica a cor no texto da mensagem também
    inputMsg.css("color", cor);
    if(cor === "green" || cor === "#3c763d" || cor === "red" || cor === "#a94442") {
         inputMsg.css("font-weight", "bold");
    }
}

// Função auxiliar para reaproveitar a lógica de cores
function aplicarEstiloCampo(elemento, cor) {
    if (cor === "green" || cor === "#dff0d8") {
        elemento.css({ "background-color": "#dff0d8", "color": "#3c763d", "font-weight": "bold" });
    } else if (cor === "red" || cor === "#f2dede" || cor === "#a94442") {
        elemento.css({ "background-color": "#f2dede", "color": "#a94442", "font-weight": "bold" });
    } else if (cor === "#d8b100") { // Atenção/Amarelo
        elemento.css({ "background-color": "#fcf8e3", "color": "#8a6d3b", "font-weight": "bold" });
    } else {
        elemento.css({ "background-color": "", "color": "black", "font-weight": "normal" });
    }
}

// =================================================================================
// 2. LÓGICA DE LEITURA DO ARQUIVO (CNAB / TXT)
// =================================================================================

function processarConteudo(texto) {
    try {
        if (typeof BradescoStrategy === 'undefined') throw new Error("Estratégia JS não encontrada.");
        var dados = BradescoStrategy.processar(texto);

        var codBancoZoom = $("#cod_banco").val();
        var codBancoArquivo = dados.codigoBanco;

        var bZoom = codBancoZoom ? codBancoZoom.replace(/[^0-9]/g, "") : "";
        var bArq = codBancoArquivo ? codBancoArquivo.replace(/[^0-9]/g, "") : "";

        if (bZoom && bArq && bZoom !== bArq) {
            FLUIGC.message.alert({
                message: '<b>ATENÇÃO: DIVERGÊNCIA DE BANCO!</b><br><br>' +
                    'No formulário: <b>' + bZoom + '</b><br>' +
                    'No arquivo: <b>' + bArq + '</b><br><br>' +
                    'Verifique se o arquivo anexo está correto.',
                title: 'Aviso de Segurança',
                label: 'Estou Ciente'
            });
        }

        $("#arq_empresa").val(dados.empresa);
        $("#arq_cnpj").val(dados.cnpj);
        var bancoCompleto = dados.codigoBanco + " - " + dados.banco;
        $("#arq_banco").val(bancoCompleto);
        $("#arq_convenio").val(dados.convenio);
        $("#arq_agencia").val(dados.agencia);
        $("#arq_conta").val(dados.conta);
        $("#arq_data_cred").val(dados.dataCredito);
        $("#arq_valor").val(dados.valor);

        FLUIGC.toast({ title: 'Sucesso', message: 'Leitura concluída!', type: 'success' });

        validarDivergencias();

    } catch (err) {
        FLUIGC.toast({ title: 'Erro', message: err.message, type: 'danger' });
    }
}

// =================================================================================
// 3. FUNÇÕES DE ZOOM
// =================================================================================

function zoomEmpresa() {
    var zoom = new Zoom();
    var codPessoa = getUserCode();

    zoom.Id = "ZoomEmpresa";
    zoom.Titulo = "Buscar Empresa";
    zoom.DataSet = "DS_FLUIG_0065";
    zoom.FieldsName = ["COD_PESSOA"];
    zoom.setRawFilters("COD_PESSOA", codPessoa);
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" }, 
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        var codColigada = linha[0];
        var nomeEmpresa = linha[1];
        var codFilial = linha[2];
        var nomeFilial = linha[3]; 
        var cnpj = linha[4];

        $("#txt_empresa").val(codColigada + " - " + nomeEmpresa);
        $("#cod_empresa").val(codColigada);
        $("#txt_filial").val(codFilial + " - " + nomeFilial);
        $("#cod_filial").val(codFilial);
        $("#txt_cnpj").val(cnpj);

        var camposParaLimpar = ["erp_id_lan", "erp_historico", "erp_empresa", "erp_cnpj", "erp_banco", "erp_agencia", "erp_conta", "erp_data_emissao", "erp_data_cred", "erp_valor"];
        camposParaLimpar.forEach(function (id) { $("#" + id).val(""); });

        FLUIGC.toast({ title: 'Empresa Alterada', message: 'Selecione um novo ID LAN.', type: 'info' });

        validarDivergencias();
    }
    zoom.Abrir();
}

function zoomBanco() {
    var zoom = new Zoom();
    zoom.Id = "ZoomBanco";
    zoom.Titulo = "Buscar Banco";
    zoom.DataSet = "DS_FLUIG_0016";
    zoom.FieldsName = [];
    zoom.Linhas = [];
    zoom.Colunas = [
        { title: "Cód. Banco", name: "NUMBANCO" },
        { title: "Nome", name: "NOME" },
        { title: "Reduzido", name: "NOMEREDUZIDO", display: false }
    ];

    zoom.Retorno = function (linha) {
        var codBanco = linha[0];
        var nomeBanco = linha[1];
        $("#txt_banco").val(codBanco + " - " + nomeBanco);
        $("#cod_banco").val(codBanco);
        validarDivergencias();
        controlarBotaoUpload(); // CHAMADA CRUCIAL PARA DESBLOQUEAR ANEXO
    }
    zoom.Abrir();
}

// Função para controlar o que aparece ou some na tela
function ajustarInterfacePorTipo(tipo) {
    if (tipo === "cnab") {
        $("#campos_originais_cnab").show();
        $("#row_cnab_inputs").show();
        $("#painel_leitura").show();
        $("#painel_erp").show();
        $("#painel_rateio").show();
        $("#container_resumo_cnab").show();

        $("#row_guia_header").hide();
        $("#painel_multi_lancamentos").hide();
        $("#painel_consolidado_guia").hide();
        $("#container_resumo_guia").hide();

    } else if (tipo === "guia_outros") {
        $("#campos_originais_cnab").hide();
        $("#row_cnab_inputs").hide();
        $("#painel_leitura").hide();
        $("#painel_erp").hide();
        $("#painel_rateio").hide();
        $("#container_resumo_cnab").hide();

        $("#row_guia_header").show();
        $("#painel_multi_lancamentos").show();
        $("#painel_consolidado_guia").show();
        $("#container_resumo_guia").show();
    }
}

function buscarDadosFinanceiros(idLan) {
    var codColigada = $("#cod_empresa").val();
    var codFilial = $("#cod_filial").val();

    if (!codColigada || !codFilial) {
        codColigada = $("#erp_cod_coligada").val();
        codFilial = $("#erp_cod_filial").val();

        if (!codColigada || !codFilial) {
            FLUIGC.toast({ title: 'Atenção', message: 'Selecione a Empresa (no cabeçalho ou quadro ERP) antes de digitar o ID LAN.', type: 'warning' });
            $("#erp_id_lan").val("");
            return;
        }
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    try {
        var constraints = [
            DatasetFactory.createConstraint("CODCOLIGADA", codColigada, codColigada, ConstraintType.MUST),
            DatasetFactory.createConstraint("CODFILIAL", codFilial, codFilial, ConstraintType.MUST),
            DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST)
        ];

        var dataset = DatasetFactory.getDataset("DS_FLUIG_0066", null, constraints, null);

        if (dataset && dataset.values && dataset.values.length > 0) {
            var linha = dataset.values[0];

            $("#erp_historico").val(linha["HISTORICO"]);
            $("#erp_valor").val(formatarValorMonetario(linha["VALOR"]));
            $("#erp_data_cred").val(formatarDataISO(linha["DTVENCIMENTO"]));
            $("#erp_data_emissao").val(formatarDataISO(linha["DTEMISSAO"]));
            $("#erp_empresa").val(linha["EMPRESA"]);
            $("#erp_cnpj").val(linha["CNPJ"]);
            $("#erp_banco").val(linha["BANCO"]);

            buscarRateio(codColigada, idLan);
            FLUIGC.toast({ title: 'Sucesso', message: 'Título encontrado.', type: 'success' });
            validarDivergencias();

        } else {
            FLUIGC.toast({ title: 'Não Encontrado', message: 'ID LAN não encontrado nesta Empresa/Filial.', type: 'warning' });
            limparCamposFinanceiros();
            $("#erp_id_lan").val(idLan);
        }

    } catch (e) {
        console.error("Erro na busca:", e);
        FLUIGC.toast({ title: 'Erro', message: 'Falha ao comunicar com o Dataset.', type: 'danger' });
        limparCamposFinanceiros();
    } finally {
        loading.hide();
    }
}

function limparCamposFinanceiros() {
    var campos = ["erp_historico", "erp_valor", "erp_data_cred", "erp_empresa", "erp_cnpj", "erp_data_emissao"];
    campos.forEach(function (id) { $("#" + id).val(""); });
    limparTabelaRateio();
    validarDivergencias();
}

// =================================================================================
// 5. CARREGAMENTO DO RATEIO (PAI x FILHO)
// =================================================================================

function buscarRateio(codColigada, idLan) {
    limparTabelaRateio();
    $("#rateio_total_calculado").val("");

    try {
        var constraints = [
            DatasetFactory.createConstraint("CODCOLIGADA", codColigada, codColigada, ConstraintType.MUST),
            DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST)
        ];

        var dataset = DatasetFactory.getDataset("DS_FLUIG_0067", null, constraints, null);

        if (dataset && dataset.values && dataset.values.length > 0) {
            for (var i = 0; i < dataset.values.length; i++) {
                var item = dataset.values[i];
                var index = wdkAddChild('tbl_rateio');
                var ccExibicao = item["CODCCUSTO"] + " - " + item["NOMECCUSTO"];
                
                $("#rateio_cc___" + index).val(ccExibicao);
                $("[name='rateio_cod_puro___" + index + "']").val(item["CODCCUSTO"]);
                $("#rateio_valor___" + index).val(formatarValorMonetario(item["VALOR"]));

                var perc = item["PERCENTUAL"] || "0";
                perc = parseFloat(perc).toFixed(2).replace('.00', '');
                $("#rateio_percentual___" + index).val(perc + "%");
            }
            calcularTotalRateio();
        }
    } catch (e) {
        console.error("Erro ao buscar rateio:", e);
    }
}

function calcularTotalRateio() {
    var totalValor = 0;
    var totalPercentual = 0;

    $("input[name^='rateio_valor___']").each(function () {
        var index = this.name.split("___")[1];
        var valorStr = $(this).val();
        if (valorStr) {
            var valorLimpo = valorStr.replace(/\./g, "").replace(",", ".");
            totalValor += parseFloat(valorLimpo) || 0;
        }
        var percStr = $("#rateio_percentual___" + index).val();
        if (percStr) {
            var percLimpo = percStr.replace("%", "").replace(",", ".");
            totalPercentual += parseFloat(percLimpo) || 0;
        }
    });

    var totalValorFormatado = totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $("#rateio_total_calculado").val(totalValorFormatado);

    var valorErp = $("#erp_valor").val();
    if (valorErp && valorErp === totalValorFormatado) {
        $("#rateio_total_calculado").css("color", "#28a745");
    } else {
        $("#rateio_total_calculado").css("color", "#dc3545");
    }

    var totalPercFixo = parseFloat(totalPercentual.toFixed(2));
    $("#rateio_total_percentual").val(totalPercFixo + "%");

    if (totalPercFixo === 100) {
        $("#rateio_total_percentual").css("color", "#28a745");
    } else {
        $("#rateio_total_percentual").css("color", "#dc3545");
    }
}

function limparTabelaRateio() {
    $("input[name^='rateio_cc___']").each(function () {
        fnWdkRemoveChild(this);
    });
}

// =================================================================================
// 6. GERAÇÃO DE TEXTO PARA E-MAIL
// =================================================================================

function gerarTextoEmail() {
    var tipoDoc = $("#tipo_documento").val();
    var tipoLancamento = "";
    var nomeEmpresa = "";
    var dataVenc = "";
    var valorTotal = "";
    var textoBanco = "";

    var listaItens = [];

    if (tipoDoc == "cnab") {
        tipoLancamento = $("#cnab_tipo_lancamento").val() || "(Tipo não informado)";
        var empRaw = $("#erp_empresa").val() || $("#txt_empresa").val();
        nomeEmpresa = extrairNome(empRaw);
        dataVenc = $("#erp_data_venc").val() || $("#erp_data_cred").val() || $("#arq_data_cred").val();
        valorTotal = $("#erp_valor").val() || $("#arq_valor").val();

        var bancoNome = $("#erp_banco").val() || $("#txt_banco").val();
        if (bancoNome && bancoNome.trim() !== "") {
            textoBanco = bancoNome;
        } else {
            textoBanco = "ERRO: BANCO NÃO INFORMADO / EM BRANCO";
        }

        var filialRaw = $("#txt_filial").val();
        var codFilial = "";
        var nomeFilial = "";

        if (filialRaw && filialRaw.indexOf(" - ") > -1) {
            var splitF = filialRaw.split(" - ");
            codFilial = splitF[0];
            nomeFilial = splitF[1];
        } else {
            codFilial = $("#cod_filial").val();
            nomeFilial = filialRaw;
        }

        var rateiosItem = [];
        $("input[name^='rateio_cc___']").each(function () {
            var idx = this.name.split("___")[1];
            var ccNome = $(this).val();
            var ccValor = $("input[name='rateio_valor___" + idx + "']").val();
            rateiosItem.push({ cc: ccNome, valor: ccValor });
        });

        listaItens.push({
            idLan: $("#erp_id_lan").val(),
            codFilial: codFilial,
            nomeFilial: nomeFilial,
            valor: valorTotal,
            rateios: rateiosItem
        });

    } else {
        tipoLancamento = $("#guia_tipo").val() || "Guia Diversa";
        var dataRaw = $("#guia_data_venc").val();
        if (dataRaw && dataRaw.indexOf("-") > -1) {
            var p = dataRaw.split("-");
            dataVenc = p[2] + "/" + p[1] + "/" + p[0];
        } else { dataVenc = dataRaw; }

        valorTotal = $("#guia_valor_total").val();
        textoBanco = "Conforme Guias Anexas / Múltiplos";

        $("input[name^='card_id_lan___']").each(function () {
            var idx = this.name.split("___")[1];
            var idLan = $(this).val();
            var valorItem = $("input[name='card_valor___" + idx + "']").val();
            var empFilialRaw = $("input[name='card_empresa___" + idx + "']").val();
            var codFilialCard = $("input[name='card_cod_filial___" + idx + "']").val();
            var nomeFilialCard = "";

            if (empFilialRaw && empFilialRaw.indexOf(" - ") > -1) {
                var partes = empFilialRaw.split(" - ");
                if (nomeEmpresa === "") nomeEmpresa = partes[0];
                nomeFilialCard = partes[1];
            }

            var jsonRateio = $("input[name='card_json_rateio___" + idx + "']").val();
            var rateiosItem = [];
            if (jsonRateio) {
                try {
                    var parsed = JSON.parse(jsonRateio);
                    for (var r = 0; r < parsed.length; r++) {
                        var it = parsed[r];
                        var vFmt = parseFloat(it.VALOR).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        rateiosItem.push({
                            cc: it.CODCCUSTO + " - " + it.NOMECCUSTO,
                            valor: vFmt
                        });
                    }
                } catch (e) { }
            }

            listaItens.push({
                idLan: idLan,
                codFilial: codFilialCard,
                nomeFilial: nomeFilialCard,
                valor: valorItem,
                rateios: rateiosItem
            });
        });
    }

    var assunto = "Folha de Pagamento - " + tipoLancamento + " - " + nomeEmpresa + " - Vencimento: " + dataVenc;
    var corpo = "Olá,\n\n";
    corpo += "Segue pagamento " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + " validado e integrado com financeiro.\n\n";

    corpo += "Empresa: " + nomeEmpresa + "\n";
    corpo += "Banco: " + textoBanco + "\n";
    corpo += "Origem: Folha de Pagamento - " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + "\n";
    corpo += "Vencimento: " + dataVenc + "\n";
    corpo += "Valor: R$ " + valorTotal + "\n\n";
    corpo += "Rateio Lançamento Financeiro\n";
    corpo += "========================================\n";

    for (var i = 0; i < listaItens.length; i++) {
        var item = listaItens[i];
        var indice = i + 1; 

        corpo += "IDLAN " + indice + ": " + item.idLan + " - " + item.codFilial + " - " + item.nomeFilial + " - R$ " + item.valor + "\n";

        if (item.rateios && item.rateios.length > 0) {
            for (var j = 0; j < item.rateios.length; j++) {
                var rat = item.rateios[j];
                corpo += "   Rateio: " + rat.cc + " -- R$ " + rat.valor + "\n";
            }
        } else {
            corpo += "   (Sem rateio detalhado)\n";
        }
        corpo += "\n"; 
    }

    $("#txt_assunto_email").val(assunto);
    $("#texto_email_resumo").val(corpo);
}

function copiarTextoEmail() {
    var copyText = document.getElementById("texto_email_resumo");
    copyText.select();
    copyText.setSelectionRange(0, 99999); 
    document.execCommand("copy");
    FLUIGC.toast({ title: 'Copiado', message: 'Texto copiado para a área de transferência.', type: 'info' });
}

function copiarAssuntoEmail() {
    var copyText = document.getElementById("txt_assunto_email");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    FLUIGC.toast({ title: 'Copiado', message: 'Assunto copiado.', type: 'info' });
}

function baixarAnexoValidado() {
    var numProcesso = $("#cpNumeroSolicitacao").val();
    var nomeArquivoEsperado = $("#tipo_documento").val() == "cnab"
        ? $("#fileNameVisual").val()
        : $("#fileNameGuia").val();

    if (!numProcesso || numProcesso == "0") {
        FLUIGC.toast({ title: 'Atenção', message: 'Solicitação ainda não iniciada.', type: 'warning' });
        return;
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    var c1 = DatasetFactory.createConstraint("processAttachmentPK.processInstanceId", numProcesso, numProcesso, ConstraintType.MUST);

    DatasetFactory.getDataset("processAttachment", null, [c1], null, {
        success: function (data) {
            loading.hide();
            if (data.values && data.values.length > 0) {
                var anexos = data.values.reverse();
                var anexoAlvo = null;

                for (var i = 0; i < anexos.length; i++) {
                    var item = anexos[i];
                    var tipo = item["documentType"];
                    if (tipo != "2" && tipo != 2) {
                        anexoAlvo = item;
                        break;
                    }
                }

                if (anexoAlvo) {
                    var docId = anexoAlvo["processAttachmentPK.documentId"] || anexoAlvo["documentId"];
                    var companyId = anexoAlvo["processAttachmentPK.companyId"] || anexoAlvo["companyId"] || 1;
                    var version = anexoAlvo["version"] || 1000;

                    var urlDownloadDireto = "/webdesk/streamcontrol/" +
                        "?WDCompanyId=" + companyId +
                        "&WDNrDocto=" + docId +
                        "&WDNrVersao=" + version;

                    var link = document.createElement('a');
                    link.href = urlDownloadDireto;
                    link.download = nomeArquivoEsperado || ("Anexo_Processo_" + numProcesso);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    FLUIGC.toast({ title: 'Aviso', message: 'Nenhum arquivo válido encontrado.', type: 'warning' });
                }
            } else {
                FLUIGC.toast({ title: 'Vazio', message: 'Nenhum anexo encontrado.', type: 'warning' });
            }
        },
        error: function (msg) {
            loading.hide();
            FLUIGC.toast({ title: 'Erro', message: 'Falha ao buscar anexo.', type: 'danger' });
        }
    });
}

function anexarArquivoGuiaNativo() {
    try {
        JSInterface.showCamera("Guia_Pagamento.pdf");
        $("#fileNameGuia").val("Arquivo anexado via Clipe/Camera");
        FLUIGC.toast({
            title: 'Ação Necessária',
            message: 'Se a janela de anexos abriu, selecione o arquivo e aguarde o upload.',
            type: 'info'
        });
    } catch (e) {
        console.error("JSInterface não disponível: " + e);
        FLUIGC.toast({
            title: 'Atenção',
            message: 'Utilize a aba de "Anexos" (ícone de clipe) para incluir o arquivo.',
            type: 'warning'
        });
    }
}

function processarEAnexarUnificado(inputElement) {
    if (inputElement.files && inputElement.files[0]) {
        var file = inputElement.files[0];
        $("#fileNameVisual").val(file.name);

        var reader = new FileReader();
        reader.onload = function (e) {
            processarConteudo(e.target.result);

            var $fileInputClone = parent.$("#ecm-navigation-inputFile-clone");
            if ($fileInputClone.length) {
                $fileInputClone.attr({
                    "data-on-camera": "true",
                    "data-file-name-camera": file.name,
                    "data-inputid": "fileNameVisual",
                    "data-filename": file.name,
                    "multiple": false
                });

                var data = { files: [file] };
                parent.$("#ecm_navigation_fileupload").fileupload('add', data);

                FLUIGC.toast({
                    title: 'Sucesso',
                    message: 'Arquivo lido e anexado via componente nativo.',
                    type: 'success'
                });
            } else {
                console.error("Componente ecm-navigation-inputFile-clone não encontrado no parent.");
            }
        };
        reader.readAsText(file, "ISO-8859-1");
    }
}

// =================================================================================
// VERIFICAÇÃO DE DUPLICIDADE (INTEGRADA COM DATASET CUSTOMIZADO)
// =================================================================================

function verificarDisponibilidadeID(coligada, idLan) {
    var filial = $("#cod_filial").val();
    var solicitacaoAtual = $("#cpNumeroSolicitacao").val() || "0";

    if (!filial) {
        buscarDadosFinanceiros(idLan);
        return;
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    var c1 = DatasetFactory.createConstraint("COD_COLIGADA", coligada, coligada, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("COD_FILIAL", filial, filial, ConstraintType.MUST);
    var c3 = DatasetFactory.createConstraint("ID_LAN", idLan, idLan, ConstraintType.MUST);
    var c4 = DatasetFactory.createConstraint("SOLICITACAO", solicitacaoAtual, solicitacaoAtual, ConstraintType.MUST);

    DatasetFactory.getDataset("DS_VERIFICAR_DUPLICIDADE", null, [c1, c2, c3, c4], null, {
        success: function (dataset) {
            loading.hide();
            if (dataset && dataset.values.length > 0) {
                var status = dataset.values[0]["STATUS"];
                var solDuplicada = dataset.values[0]["SOLICITACAO"];
                if (status === "DUPLICADO") {
                    avisoDuplicidade(solDuplicada, idLan);
                } else {
                    buscarDadosFinanceiros(idLan);
                }
            } else {
                buscarDadosFinanceiros(idLan);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            loading.hide();
            console.error("Erro verificação duplicidade:", errorThrown);
            buscarDadosFinanceiros(idLan);
        }
    });
}

function avisoDuplicidade(solicitacao, idLan) {
    $("#erp_id_lan").val("");
    limparCamposFinanceiros();

    FLUIGC.message.confirm({
        message: '<b>DUPLICIDADE IDENTIFICADA!</b><br><br>' +
            'O ID LAN <b>' + idLan + '</b> já está em uso na solicitação <b>' + solicitacao + '</b>, que ainda está em andamento.<br><br>' +
            'Não é permitido pagar o mesmo título em dois processos simultâneos.',
        title: 'Registro Já Existente',
        labelYes: 'Ver Solicitação Existente',
        labelNo: 'Cancelar'
    }, function (result) {
        if (result) {
            var url = "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + solicitacao;
            window.open(url, '_blank');
        }
    });
}

// Alterna a interface entre CNAB (1 para 1) e Guia (1 para N)
function alternarTipoDocumento() {
    var tipo = $("#tipo_documento").val();

    if (tipo == "cnab") {
        $("#campos_originais_cnab").show();
        $("#row_cnab_inputs").show();
        $("#painel_leitura").show();
        $("#painel_erp").show();
        $("#painel_rateio").show();
        $("#container_resumo_cnab").show();

        $("#row_guia_header").hide();
        $("#painel_multi_lancamentos").hide();
        $("#painel_consolidado_guia").hide();
        $("#container_resumo_guia").hide();

    } else {
        $("#campos_originais_cnab").hide();
        $("#row_cnab_inputs").hide();
        $("#painel_leitura").hide();
        $("#painel_erp").hide();
        $("#painel_rateio").hide();
        $("#container_resumo_cnab").hide();

        $("#row_guia_header").show();
        $("#painel_multi_lancamentos").show();
        $("#painel_consolidado_guia").show();
        $("#container_resumo_guia").show();
    }
    limparCamposFinanceiros();
}

function adicionarCardGuia() {
    var index = wdkAddChild('tbl_lancamentos_guia');
    if (window.MaskEvent) MaskEvent.init();
    var inputRecemCriado = $("input[name='card_id_lan___" + index + "']");
    if (inputRecemCriado.length > 0) {
        var novaLinha = inputRecemCriado.closest("tr");
        var tbody = novaLinha.closest("tbody");
        tbody.prepend(novaLinha);
        novaLinha.find(".panel").css("background-color", "#dff0d8").animate({ backgroundColor: "#fff" }, 1000);
    }
}

function toggleCard(btn) {
    var cardBody = $(btn).closest(".panel").find(".panel-body.body-card-collapse");
    var icon = $(btn).find("i");
    var resumo = $(btn).closest(".panel-heading").find(".resumo-card");

    var linha = $(btn).closest("tr");
    var idLan = linha.find("input[name^='card_id_lan']").val();
    var valor = linha.find("input[name^='card_valor']").val();
    var historico = linha.find("input[name^='card_historico']").val();

    if (cardBody.is(":visible")) {
        cardBody.slideUp();
        icon.removeClass("flaticon-chevron-up").addClass("flaticon-chevron-down");
        if (idLan) {
            var textoResumo = "ID: " + idLan + " | R$ " + valor + " - " + historico.substring(0, 30) + "...";
            resumo.text(textoResumo).fadeIn();
        }
    } else {
        cardBody.slideDown();
        icon.removeClass("flaticon-chevron-down").addClass("flaticon-chevron-up");
        resumo.fadeOut();
    }
}

function zoomEmpresaCard(element) {
    var index = element.id ? element.id.split("___")[1] : $(element).closest("tr").find("input")[0].name.split("___")[1];
    if (!index) {
        var inputName = $(element).closest(".input-group").find("input").attr("name");
        index = inputName.split("___")[1];
    }

    var zoom = new Zoom();
    zoom.Id = "ZoomEmpresaCard_" + index;
    zoom.Titulo = "Buscar Empresa (Card)";
    zoom.DataSet = "DS_FLUIG_0065"; 
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" },
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        $("#card_empresa___" + index).val(linha[1] + " - " + linha[3]); 
        $("#card_cod_coligada___" + index).val(linha[0]);
        $("#card_cod_filial___" + index).val(linha[2]);
        $("#card_cnpj___" + index).val(linha[4]);

        $("#card_id_lan___" + index).val("");
        $("#card_historico___" + index).val("");
        $("#card_valor___" + index).val("");
        $("#tbody_rateio_card___" + index).empty(); 
    };
    zoom.Abrir();
}

function buscarDadosCard(element) {
    var idLan = $(element).val();
    var index = element.name.split("___")[1];
    var rowContext = $(element).closest("tr");
    var coligada = rowContext.find("input[name^='card_cod_coligada']").val();
    var filial = rowContext.find("input[name^='card_cod_filial']").val();

    if (!idLan) return;

    if (!coligada || !filial) {
        FLUIGC.toast({ title: 'Atenção', message: 'Selecione a empresa do card antes de digitar o ID LAN.', type: 'warning' });
        $(element).val("");
        return;
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    try {
        var c1 = DatasetFactory.createConstraint("CODCOLIGADA", coligada, coligada, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("CODFILIAL", filial, filial, ConstraintType.MUST);
        var c3 = DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST);

        var dsTitulo = DatasetFactory.getDataset("DS_FLUIG_0066", null, [c1, c2, c3], null);

        if (dsTitulo && dsTitulo.values.length > 0) {
            var row = dsTitulo.values[0];
            $("#card_historico___" + index).val(row["HISTORICO"]);
            $("#card_valor___" + index).val(formatarValorMonetario(row["VALOR"]));
            $("#card_data_venc___" + index).val(formatarDataISO(row["DTVENCIMENTO"]));
            $("#card_data_emissao___" + index).val(formatarDataISO(row["DTEMISSAO"]));

            buscarRateioVisual(coligada, idLan, index, rowContext);
            atualizarResumoGuia(); 
            FLUIGC.toast({ title: 'Sucesso', message: 'Dados carregados.', type: 'success' });
        } else {
            FLUIGC.toast({ title: 'Erro', message: 'ID LAN não encontrado.', type: 'danger' });
            $("#card_historico___" + index).val("");
            $("#card_valor___" + index).val("");
            rowContext.find(".tbody-rateio-card").empty();
            rowContext.find(".total-perc-card").text("0%");
            rowContext.find(".total-valor-card").text("0,00");
            atualizarResumoGuia();
        }
    } catch (e) {
        console.error(e);
        FLUIGC.toast({ title: 'Erro', message: 'Falha no Dataset.', type: 'danger' });
    } finally {
        loading.hide();
    }
}

function buscarRateioVisual(coligada, idLan, index, rowContext) {
    if (!rowContext) {
        rowContext = $("[name='card_id_lan___" + index + "']").closest("tr");
    }

    var c1 = DatasetFactory.createConstraint("CODCOLIGADA", coligada, coligada, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST);
    var dsRateio = DatasetFactory.getDataset("DS_FLUIG_0067", null, [c1, c2], null);

    var tbody = rowContext.find(".tbody-rateio-card");
    var lblPerc = rowContext.find(".total-perc-card");
    var lblValor = rowContext.find(".total-valor-card");

    tbody.empty();

    var totalValor = 0;
    var totalPercentual = 0;
    var listaRateio = [];

    if (dsRateio && dsRateio.values.length > 0) {
        for (var i = 0; i < dsRateio.values.length; i++) {
            var item = dsRateio.values[i];
            var valFloat = parseFloat(item["VALOR"]) || 0;
            var percFloat = parseFloat(item["PERCENTUAL"]) || 0;

            totalValor += valFloat;
            totalPercentual += percFloat;

            var tr = "<tr>";
            tr += "<td>" + item["CODCCUSTO"] + " - " + item["NOMECCUSTO"] + "</td>";
            tr += "<td class='text-center'>" + percFloat.toFixed(2) + "%</td>";
            tr += "<td class='text-right'>" + formatarValorMonetario(valFloat) + "</td>";
            tr += "</tr>";

            tbody.append(tr);
            listaRateio.push(item);
        }

        $("#card_json_rateio___" + index).val(JSON.stringify(listaRateio));

        var totalPercFixo = parseFloat(totalPercentual.toFixed(2));
        var totalValorFixo = formatarValorMonetario(totalValor);

        lblPerc.text(totalPercFixo + "%");
        lblValor.text(totalValorFixo);

        if (totalPercFixo === 100) lblPerc.css("color", "#28a745");
        else lblPerc.css("color", "#dc3545");

        var valorCabecalho = $("#card_valor___" + index).val();
        if (valorCabecalho === totalValorFixo) lblValor.css("color", "#28a745");
        else lblValor.css("color", "#dc3545");

    } else {
        tbody.append("<tr><td colspan='3' class='text-center text-warning'>Nenhum rateio encontrado.</td></tr>");
        lblPerc.text("0%");
        lblValor.text("0,00");
    }
}

// =================================================================================
// LOGICA DE RESUMO / CONSOLIDADO DA GUIA
// =================================================================================

function removerCardGuia(oElement) {
    fnWdkRemoveChild(oElement);
    setTimeout(function () {
        atualizarResumoGuia();
    }, 200);
}

function atualizarResumoGuia() {
    var tbody = $("#tbody_resumo_guia");
    tbody.empty();

    var totalAcumulado = 0.00;
    var listaDatas = [];

    $("input[name^='card_id_lan___']").each(function () {
        var index = this.name.split("___")[1];
        var idLan = $(this).val();
        var valorStr = $("#card_valor___" + index).val();
        var dataCard = $("#card_data_venc___" + index).val();

        var codColigada = $("#card_cod_coligada___" + index).val() || "";
        var codFilial = $("#card_cod_filial___" + index).val() || "";
        var empFilialRaw = $("#card_empresa___" + index).val(); 
        var nomeFilial = "";

        if (empFilialRaw && empFilialRaw.indexOf(" - ") > -1) {
            nomeFilial = empFilialRaw.split(" - ")[1];
        } else {
            nomeFilial = empFilialRaw;
        }

        var textoColigadaFilial = codColigada + " - " + codFilial + " - " + nomeFilial;

        if (idLan && valorStr) {
            var valorFloat = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
            if (!isNaN(valorFloat)) totalAcumulado += valorFloat;

            if (dataCard) listaDatas.push(dataCard);

            var tr = "<tr>" +
                "<td>" + idLan + "</td>" +
                "<td>" + textoColigadaFilial + "</td>" +
                "<td class='text-right'>" + valorStr + "</td>" +
                "</tr>";
            tbody.append(tr);
        }
    });

    var totalFormatado = formatarValorMonetario(totalAcumulado);
    $("#lbl_total_consolidado").text(totalFormatado);

    validarGuiaCompleta(totalFormatado, listaDatas);
}

function validarGuiaCompleta(totalItens, listaDatas) {
    var temDivergencia = false;
    var qtdItens = listaDatas.length; 

    var valorCabecalho = $("#guia_valor_total").val();
    var statusValor = "AGUARDANDO";
    var detalheValor = "Adicione os títulos abaixo.";
    var corValor = "black";

    var dataCabecalhoRaw = $("#guia_data_venc").val();
    var statusData = "AGUARDANDO";
    var detalheData = "Adicione os títulos abaixo.";
    var corData = "black";


    if (qtdItens > 0) {
        // 1. Validação Valor
        if (!valorCabecalho) {
            statusValor = "PENDENTE";
            detalheValor = "Informe o valor no cabeçalho.";
            corValor = "black";
        } else if (valorCabecalho === totalItens) {
            statusValor = "OK";
            detalheValor = "Valores conferem.";
            corValor = "green";
        } else {
            var valCabecalhoFloat = parseFloat(valorCabecalho.replace(/\./g, "").replace(",", ".")) || 0;
            var valItensFloat = parseFloat(totalItens.replace(/\./g, "").replace(",", ".")) || 0;
            var diferenca = valCabecalhoFloat - valItensFloat;
            var diferencaFmt = diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            statusValor = "DIVERGENTE";
            detalheValor = "Guia/Outros: " + valorCabecalho + " | Soma Quadro Contas a Pagar: " + totalItens + " (Dif: " + diferencaFmt + ")";
            corValor = "red";
            temDivergencia = true;
        }

        // 2. Validação Data
        var dataCabecalhoPT = "";
        if (dataCabecalhoRaw) {
            var p = dataCabecalhoRaw.split("-");
            dataCabecalhoPT = p[2] + "/" + p[1] + "/" + p[0];
        }

        if (!dataCabecalhoPT) {
            statusData = "PENDENTE";
            detalheData = "Informe a data no cabeçalho.";
            corData = "black";
        } else {
            var datasDiferentes = listaDatas.filter(function (d) { return d !== dataCabecalhoPT; });
            if (datasDiferentes.length === 0) {
                statusData = "OK";
                detalheData = "Todas as datas são: " + dataCabecalhoPT;
                corData = "green";
            } else {
                statusData = "DIVERGENTE";
                detalheData = "Há " + datasDiferentes.length + " título(s) com data diferente da Guia/Outros.";
                corData = "red";
                temDivergencia = true;
            }
        }
    } else {
        // Se não tem itens, limpa status se não tiver cabeçalho também
        if (!valorCabecalho && !dataCabecalhoRaw) {
            statusValor = ""; detalheValor = ""; corValor = "";
            statusData = ""; detalheData = ""; corData = "";
        }
    }

    // PERSISTÊNCIA: Usar os novos Inputs e Função de Estilo
    atualizarLinhaValidacao("status_guia_valor", "detalhe_guia_valor", statusValor, detalheValor, corValor);
    atualizarLinhaValidacao("status_guia_data", "detalhe_guia_data", statusData, detalheData, corData);

    $("#check_ok").prop("disabled", false);

    if (temDivergencia) {
        $("#cpTemDivergencia").val("sim");
        $("#painel_consolidado_guia").removeClass("panel-primary").addClass("panel-warning");
    } else {
        $("#cpTemDivergencia").val("nao");
        $("#painel_consolidado_guia").removeClass("panel-warning").addClass("panel-primary");
    }
}

function controlarBotaoUpload() {
    var tipo = $("#tipo_documento").val();
    var codBanco = $("#cod_banco").val();
    var btn = $("#btn_upload_cnab");

    if (tipo === "cnab") {
        if (!codBanco || codBanco === "") {
            btn.prop("disabled", true);
            btn.attr("title", "Selecione o Banco antes de anexar");
            btn.removeClass("btn-primary").addClass("btn-default");
        } else {
            btn.prop("disabled", false);
            btn.attr("title", "Localizar e Anexar Arquivo");
            btn.removeClass("btn-default").addClass("btn-primary");
        }
    }
}