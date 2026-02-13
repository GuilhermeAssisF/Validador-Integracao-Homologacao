// =================================================================================
// INÍCIO DO SCRIPT PRINCIPAL
// =================================================================================
$(document).ready(function () {

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
            controlarBotaoUpload();
            limparCamposFinanceiros();
        });

        // Executa ajuste inicial ao carregar a página (SEM LIMPAR DADOS)
        ajustarInterfacePorTipo($("#tipo_documento").val());
        controlarBotaoUpload();

        $("#btn_upload_cnab").click(function () {
            if ($("#tipo_documento").val() == "cnab" && !$("#cod_banco").val()) {
                FLUIGC.toast({ title: 'Atenção', message: 'Selecione o Banco antes de anexar o arquivo.', type: 'warning' });
                return;
            }
            $("#fileUpload").click(); // Dispara o input file oculto
        });

        // 3. RESTAURAÇÃO DE CORES/VALIDAÇÃO (CRUCIAL PARA TASK 14)
        // Se os campos já vieram preenchidos do banco, rodamos a validação para pintar de verde/vermelho
        if ($("#erp_id_lan").val() && $("#erp_historico").val()) {
            console.log("Dados encontrados. Reaplicando validação visual...");
            validarDivergencias();
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

    // Se o campo estiver vazio (primeira vez), assume 0
    var atividade = $("#wkNumState_hidden").val() || 0;
    
    // Verifica se já temos um resumo salvo
    var resumoSalvo = $("#html_resumo_congelado").val();

    console.log(">>> Atividade Atual: " + atividade); // Para debug
    console.log(">>> Resumo Salvo? " + (resumoSalvo ? "Sim" : "Não"));

    // LÓGICA DE EXIBIÇÃO
    if (atividade != 0 && atividade != 4 && atividade != 12 && resumoSalvo && resumoSalvo.trim() !== "") {
        
        console.log(">>> MODO LEITURA: Exibindo Resumo Congelado <<<");

        $("#painel_resumo_14").show();
        $("#conteudo_resumo_estatico").html(resumoSalvo);
        
        // Oculta os painéis de edição
        $("#painel_info, #painel_leitura, #painel_erp, #painel_rateio, #painel_resumo").hide();
        $("#painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia").hide();
        $("#campos_originais_cnab, #row_cnab_inputs, #row_guia_header").hide();

    } else {
        $("#painel_resumo_14").hide();
    }

});

// =================================================================================
// HELPERS (Auxiliares)
// =================================================================================

function getLoginUsuario() {
    try { return window.parent.WCMAPI.userLogin; } catch (e) { return ""; }
}

function getUserCode() {
    try { return window.parent.WCMAPI.userCode; } catch (e) { return ""; }
}

// Remove caracteres especiais para comparação (pontos, traços, barras)
function limparCaracteres(valor) {
    if (!valor) return "";
    return valor.replace(/[\.\-\/]/g, "").trim();
}

// Extrai apenas o NOME se o campo estiver no formato "CÓDIGO - NOME"
function extrairNome(valor) {
    if (!valor) return "";
    if (valor.indexOf(" - ") > -1) {
        return valor.split(" - ")[1].trim();
    }
    return valor.trim();
}

// Função para converter "2008-07-01T00:00:00" para "01/07/2008"
function formatarDataISO(dataISO) {
    if (!dataISO) return "";

    // Pega apenas a parte da data (YYYY-MM-DD) ignorando a hora
    var dataLimpa = dataISO.substring(0, 10);
    var partes = dataLimpa.split("-"); // Cria array: [2008, 07, 01]

    // Se tiver 3 partes, remonta como DD/MM/YYYY
    if (partes.length === 3) {
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    return dataISO; // Retorna original se não estiver no padrão esperado
}

// Função para converter "1813.4000" para "1.813,40"
function formatarValorMonetario(valor) {
    if (!valor) return "0,00";

    // Garante que é um número (limpa caracteres estranhos se houver)
    var numero = parseFloat(valor);

    // Se não for número válido, retorna zerado
    if (isNaN(numero)) return "0,00";

    // 1. Fixa em 2 casas decimais (Ex: 1813.4 -> "1813.40")
    // 2. Troca ponto por vírgula (Ex: "1813.40" -> "1813,40")
    // 3. Adiciona ponto de milhar usando Regex (Ex: "1813,40" -> "1.813,40")
    return numero.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

// =================================================================================
// 1. LÓGICA DE VALIDAÇÃO (Nova Função)
// =================================================================================

function validarDivergencias() {
    console.log("Executando validação cruzada (POR CÓDIGO DO BANCO)...");

    // Helper simples para limpar qualquer coisa que não seja número (ex: "341 - Itau" vira "341")
    function apenasNumeros(str) {
        if (!str) return "";
        // Pega apenas a parte numérica ou o primeiro bloco antes de um traço
        // Se vier "341", retorna "341". Se vier "341 - Itau", retorna "341".
        var partes = str.toString().split("-");
        return partes[0].replace(/[^0-9]/g, "");
    }

    // --- 1. CAPTURA DOS VALORES ---

    // Painel Solicitação
    var reqEmpresa = extrairNome($("#txt_empresa").val());
    var reqCnpj = limparCaracteres($("#txt_cnpj").val());
    // MUDANÇA: Pegamos o CODIGO escondido (campo hidden do zoom)
    var reqBancoCod = apenasNumeros($("#cod_banco").val());

    // Painel Arquivo
    var arqEmpresa = extrairNome($("#arq_empresa").val());
    var arqCnpj = limparCaracteres($("#arq_cnpj").val());
    // MUDANÇA: Pegamos o CODIGO salvo no atributo data-codigo
    var arqBancoCod = apenasNumeros($("#arq_banco").val());

    var arqValor = $("#arq_valor").val();
    var arqData = $("#arq_data_cred").val();

    // Painel ERP
    var erpEmpresa = extrairNome($("#erp_empresa").val());
    var erpCnpj = limparCaracteres($("#erp_cnpj").val());
    // MUDANÇA: Pegamos o valor direto do campo ERP (que você disse ser 341)
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

    // C. BANCO (VALIDAÇÃO POR CÓDIGO)
    var statusBanco = "PENDENTE";
    var msgBanco = "";
    var corBanco = "black";

    // Verifica se temos os 3 códigos
    if (reqBancoCod && arqBancoCod && erpBancoCod) {
        // Compara estritamente os números (ex: "341" == "341")
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
            // AJUSTE SOLICITADO: Se baterem, mas faltar ERP, avisa que está pendente/faltando campo
            statusBanco = "PENDENTE";
            msgBanco = "Falta o Banco no Quadro Contas a Pagar (Verifique o ERP).";
            corBanco = "#d8b100"; // Cor de atenção (Laranja/Amarelo escuro)
        } else {
            // Se já não baterem entre si, mantém o aviso de divergência
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

    // --- 3. ATUALIZAÇÃO VISUAL NA TABELA ---

    atualizarLinhaValidacao("chk_empresa", "msg_empresa", statusEmpresa, msgEmpresa, corEmpresa);
    atualizarLinhaValidacao("chk_cnpj", "msg_cnpj", statusCnpj, msgCnpj, corCnpj);

    // Atualiza o Banco
    atualizarLinhaValidacao("chk_banco", "msg_banco", statusBanco, msgBanco, corBanco);

    // Atualiza Valor e Data
    atualizarLinhaValidacao("chk_valor", "msg_valor", statusValor, (statusValor == "ERRO" ? "Valores Diferentes" : "Valores Iguais"), (statusValor == "OK" ? "green" : statusValor == "ERRO" ? "red" : "black"));
    atualizarLinhaValidacao("chk_data_cred", "msg_data_cred", statusData, (statusData == "ERRO" ? "Datas Diferentes" : "Datas Iguais"), (statusData == "OK" ? "green" : statusData == "ERRO" ? "red" : "black"));

    // Lógica Final de Divergência
    // Aceita "OK" OU "ATENÇÃO" na empresa como válido para não bloquear o fluxo
    if (statusBanco === "OK" && statusValor === "OK" && statusData === "OK") {

        if (statusEmpresa === "OK") {
            // Tudo 100%
            $("#cpTemDivergencia").val("nao");
        } else if (statusEmpresa === "ATENÇÃO") {
            // Divergência leve (Nome Empresa) -> Grava "aviso" para o painel
            $("#cpTemDivergencia").val("aviso");
        } else {
            // Erro na empresa (Pendente ou Erro Grave)
            $("#cpTemDivergencia").val("sim");
        }

    } else {
        // Bloqueia se houver erro em Banco, Valor ou Data
        $("#cpTemDivergencia").val("sim");
    }

    if (typeof gerarTextoEmail === 'function') gerarTextoEmail();

}

function atualizarLinhaValidacao(idInput, idSpan, valor, mensagem, cor) {
    $("[name='" + idInput + "']").val(valor).css("color", cor).css("font-weight", "bold");
    $("#" + idSpan).text(mensagem).css("color", cor);
}

// =================================================================================
// 2. LÓGICA DE LEITURA DO ARQUIVO (CNAB / TXT)
// =================================================================================
// Função Ajustada para o CNAB (Lê para validar E pede para anexar)
// function lerArquivo(inputElement) {
//     if (inputElement.files && inputElement.files[0]) {
//         var file = inputElement.files[0];
//         $("#fileNameVisual").val(file.name);

//         var reader = new FileReader();
//         reader.onload = function (e) {
//             // 1. Processa e Valida (Chama a função acima com o alerta do banco)
//             processarConteudo(e.target.result);

//             // 2. Solicita Anexo Manual (Lógica Original "Voltou")
//             FLUIGC.message.alert({
//                 message: '<b>Leitura concluída!</b><br><br>' +
//                     'Para salvar o arquivo no processo, a janela de anexos será aberta.<br>' +
//                     'Por favor, <b>anexe o arquivo novamente</b> para confirmar.',
//                 title: 'Ação Necessária',
//                 label: 'Anexar Agora'
//             }, function (el, ev) {
//                 // Abre a interface nativa de anexos/câmera
//                 if (window.JSInterface && JSInterface.showCamera) {
//                     JSInterface.showCamera(file.name);
//                 } else {
//                     // Fallback se não estiver no mobile/app
//                     FLUIGC.toast({ title: 'Anexo', message: 'Utilize o clipe de papel para anexar o arquivo.', type: 'info' });
//                 }
//             });
//         };
//         reader.readAsText(file, "ISO-8859-1");
//     }
// }

function processarConteudo(texto) {
    try {
        if (typeof BradescoStrategy === 'undefined') throw new Error("Estratégia JS não encontrada.");
        var dados = BradescoStrategy.processar(texto);

        // 1. Validação de Alerta (Divergência Zoom x Arquivo)
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

        // 2. Preenchimento dos Campos
        $("#arq_empresa").val(dados.empresa);
        $("#arq_cnpj").val(dados.cnpj);

        // --- CORREÇÃO AQUI: Salvamos "CÓDIGO - NOME" no value para persistir no banco ---
        // Antes era: $("#arq_banco").val(dados.banco);
        // Agora fica:
        var bancoCompleto = dados.codigoBanco + " - " + dados.banco;
        $("#arq_banco").val(bancoCompleto);
        // --------------------------------------------------------------------------------

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

    // 1. ADICIONADO O CAMPO "FILIAL" NA LISTA DE COLUNAS
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" }, // Nova coluna vinda do seu Dataset
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        // Como adicionamos uma coluna no meio (índice 3), o índice do CNPJ mudou para 4
        var codColigada = linha[0];
        var nomeEmpresa = linha[1];
        var codFilial = linha[2];
        var nomeFilial = linha[3]; // Novo valor recuperado
        var cnpj = linha[4];       // Ajustado índice (era 3)

        $("#txt_empresa").val(codColigada + " - " + nomeEmpresa);
        $("#cod_empresa").val(codColigada);

        // 2. ALTERADA A CONCATENAÇÃO AQUI
        // Antes: $("#txt_filial").val(codFilial + " - " + nomeEmpresa);
        $("#txt_filial").val(codFilial + " - " + nomeFilial);

        $("#cod_filial").val(codFilial);
        $("#txt_cnpj").val(cnpj);

        // Limpa painel ERP ao trocar empresa
        var camposParaLimpar = ["erp_id_lan", "erp_historico", "erp_empresa", "erp_cnpj", "erp_banco", "erp_agencia", "erp_conta", "erp_data_emissao", "erp_data_cred", "erp_valor"];
        camposParaLimpar.forEach(function (id) { $("#" + id).val(""); });

        FLUIGC.toast({ title: 'Empresa Alterada', message: 'Selecione um novo ID LAN.', type: 'info' });

        // CHAMA VALIDAÇÃO
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

        // CHAMA VALIDAÇÃO
        validarDivergencias();

        // Atualiza o botão de upload (caso esteja em CNAB)
        controlarBotaoUpload();
    }
    zoom.Abrir();
}

// Função para controlar o que aparece ou some na tela
function ajustarInterfacePorTipo(tipo) {
    if (tipo === "cnab") {
        console.log("Modo CNAB selecionado");

        // 1. Alterna as linhas de inputs
        $("#row_cnab_inputs").show();
        $("#row_guia_inputs").hide();

        // 2. Painel de Leitura (Exibe)
        $("#painel_leitura").show();

        // Oculta coisas de guia
        $("#row_guia_header").hide();
        $("#painel_multi_lancamentos").hide();
        $("#painel_consolidado_guia").hide();

    } else if (tipo === "guia_outros") {
        console.log("Modo Guia/Outros selecionado");

        // 1. Alterna as linhas de inputs
        $("#row_cnab_inputs").hide();
        $("#row_guia_inputs").show();

        // 2. Painel de Leitura (Oculta)
        $("#painel_leitura").hide();

        // Exibe coisas de guia
        $("#row_guia_header").show();
        $("#painel_multi_lancamentos").show();
        $("#painel_consolidado_guia").show();
    }

}

function buscarDadosFinanceiros(idLan) {
    // CORREÇÃO: Usa os IDs globais (#cod_empresa) que valem tanto para CNAB quanto ERP
    var codColigada = $("#cod_empresa").val();
    var codFilial = $("#cod_filial").val();

    if (!codColigada || !codFilial) {
        // Tenta buscar pelo nome antigo caso tenha algum legado, senão avisa
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
        console.log("Buscando IDLAN: " + idLan + " na Coligada: " + codColigada + " / Filial: " + codFilial);

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

            // Preenche dados da empresa para confirmação visual
            $("#erp_empresa").val(linha["EMPRESA"]);
            $("#erp_cnpj").val(linha["CNPJ"]);

            // Preenche o Banco
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
    // Limpa apenas os campos do quadro ERP (exceto o ID LAN que o usuário digitou)
    var campos = ["erp_historico", "erp_valor", "erp_data_cred", "erp_empresa", "erp_cnpj", "erp_data_emissao"];
    campos.forEach(function (id) { $("#" + id).val(""); });

    // LIMPA A TABELA DE RATEIO TAMBÉM
    limparTabelaRateio();

    // Reseta as validações visuais para "Pendente"
    validarDivergencias();
}

// =================================================================================
// 5. CARREGAMENTO DO RATEIO (PAI x FILHO)
// =================================================================================

function buscarRateio(codColigada, idLan) {
    console.log("Buscando Rateio para IDLAN: " + idLan);
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

                // Realiza a concatenação: Código - Nome
                var ccExibicao = item["CODCCUSTO"] + " - " + item["NOMECCUSTO"];

                // Preenche os campos da tabela
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

    // Itera sobre as linhas da tabela
    $("input[name^='rateio_valor___']").each(function () {
        var index = this.name.split("___")[1];

        // 1. Soma Valor
        var valorStr = $(this).val();
        if (valorStr) {
            var valorLimpo = valorStr.replace(/\./g, "").replace(",", ".");
            totalValor += parseFloat(valorLimpo) || 0;
        }

        // 2. Soma Percentual
        var percStr = $("#rateio_percentual___" + index).val();
        if (percStr) {
            var percLimpo = percStr.replace("%", "").replace(",", ".");
            totalPercentual += parseFloat(percLimpo) || 0;
        }
    });

    // --- ATUALIZA CAMPO VALOR ---
    var totalValorFormatado = totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $("#rateio_total_calculado").val(totalValorFormatado);

    // Validação Visual (Apenas Texto Colorido)
    var valorErp = $("#erp_valor").val();

    // Compara removendo formatação para garantir igualdade numérica
    // Mas para visualização rápida, string exacta funciona bem se ambos estiverem formatados iguais
    if (valorErp && valorErp === totalValorFormatado) {
        // Verde e sem bordas/fundo, apenas destaque no texto
        $("#rateio_total_calculado").css("color", "#28a745");
    } else {
        // Vermelho alerta
        $("#rateio_total_calculado").css("color", "#dc3545");
    }

    // --- ATUALIZA CAMPO PERCENTUAL ---
    var totalPercFixo = parseFloat(totalPercentual.toFixed(2));
    $("#rateio_total_percentual").val(totalPercFixo + "%");

    if (totalPercFixo === 100) {
        $("#rateio_total_percentual").css("color", "#28a745");
    } else {
        $("#rateio_total_percentual").css("color", "#dc3545");
    }
}

function limparTabelaRateio() {
    // Seleciona todos os inputs que possuem o sufixo de índice (___)
    // e remove a linha (TR) inteira correspondente.
    $("input[name^='rateio_cc___']").each(function () {
        fnWdkRemoveChild(this); // Função nativa do Fluig para remover filho corretamente
    });
}

// =================================================================================
// 6. GERAÇÃO DE TEXTO PARA E-MAIL (ATIVIDADE RH)
// =================================================================================

// =================================================================================
// 6. GERAÇÃO DE TEXTO PARA E-MAIL (ATIVIDADE RH) - VERSÃO CUSTOMIZADA
// =================================================================================

function gerarTextoEmail() {
    console.log("Gerando texto de e-mail (Template Folha de Pagamento - Organizado)...");

    // 1. DADOS GERAIS
    var tipoDoc = $("#tipo_documento").val();
    var tipoLancamento = "";
    var nomeEmpresa = "";
    var dataVenc = "";
    var valorTotal = "";
    var textoBanco = "";

    // Variáveis para o loop de itens
    var listaItens = [];

    // --- MODO CNAB ---
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

    }
    // --- MODO GUIA ---
    else {
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

    // 2. MONTAGEM DO ASSUNTO
    var assunto = "Folha de Pagamento - " + tipoLancamento + " - " + nomeEmpresa + " - Vencimento: " + dataVenc;

    // 3. MONTAGEM DO CORPO
    var corpo = "Olá,\n\n";
    corpo += "Segue pagamento " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + " validado e integrado com financeiro.\n\n";

    corpo += "Empresa: " + nomeEmpresa + "\n";
    corpo += "Banco: " + textoBanco + "\n";
    corpo += "Origem: Folha de Pagamento - " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + "\n";
    corpo += "Vencimento: " + dataVenc + "\n";
    corpo += "Valor: R$ " + valorTotal + "\n\n";

    corpo += "Rateio Lançamento Financeiro\n";
    corpo += "========================================\n";

    // Loop dos Itens (ORGANIZADO)
    for (var i = 0; i < listaItens.length; i++) {
        var item = listaItens[i];
        var indice = i + 1; // Contador (1, 2, 3...)

        // Linha Principal: IDLAN X: Dados...
        corpo += "IDLAN " + indice + ": " + item.idLan + " - " + item.codFilial + " - " + item.nomeFilial + " - R$ " + item.valor + "\n";

        // Linhas de Rateio (Indentadas com espaço para hierarquia)
        if (item.rateios && item.rateios.length > 0) {
            for (var j = 0; j < item.rateios.length; j++) {
                var rat = item.rateios[j];
                // Adicionei 3 espaços no início para recuar e ficar visualmente "dentro" do IDLAN
                corpo += "   Rateio: " + rat.cc + " -- R$ " + rat.valor + "\n";
            }
        } else {
            corpo += "   (Sem rateio detalhado)\n";
        }

        corpo += "\n"; // Linha em branco para separar do próximo bloco
    }

    // 4. PREENCHIMENTO DOS CAMPOS
    $("#txt_assunto_email").val(assunto);
    $("#texto_email_resumo").val(corpo);
}

function copiarTextoEmail() {
    var copyText = document.getElementById("texto_email_resumo");
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* Para mobile */
    document.execCommand("copy");
    FLUIGC.toast({ title: 'Copiado', message: 'Texto copiado para a área de transferência.', type: 'info' });
}

// Função para copiar o Assunto
function copiarAssuntoEmail() {
    var copyText = document.getElementById("txt_assunto_email");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    FLUIGC.toast({ title: 'Copiado', message: 'Assunto copiado.', type: 'info' });
}

// 2. Função para baixar anexo (Task 12)
function baixarAnexoValidado() {
    var numProcesso = $("#cpNumeroSolicitacao").val();

    // Recupera o nome original para salvar com o nome correto
    var nomeArquivoEsperado = $("#tipo_documento").val() == "cnab"
        ? $("#fileNameVisual").val()
        : $("#fileNameGuia").val();

    if (!numProcesso || numProcesso == "0") {
        FLUIGC.toast({ title: 'Atenção', message: 'Solicitação ainda não iniciada.', type: 'warning' });
        return;
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    // 1. Busca o ID do documento no Dataset
    var c1 = DatasetFactory.createConstraint("processAttachmentPK.processInstanceId", numProcesso, numProcesso, ConstraintType.MUST);

    DatasetFactory.getDataset("processAttachment", null, [c1], null, {
        success: function (data) {
            loading.hide();

            if (data.values && data.values.length > 0) {
                var anexos = data.values.reverse(); // Pega o mais recente
                var anexoAlvo = null;

                for (var i = 0; i < anexos.length; i++) {
                    var item = anexos[i];
                    var tipo = item["documentType"];
                    // Ignora pastas (2)
                    if (tipo != "2" && tipo != 2) {
                        anexoAlvo = item;
                        break;
                    }
                }

                if (anexoAlvo) {
                    var docId = anexoAlvo["processAttachmentPK.documentId"] || anexoAlvo["documentId"];
                    var companyId = anexoAlvo["processAttachmentPK.companyId"] || anexoAlvo["companyId"] || 1;
                    var version = anexoAlvo["version"] || 1000;

                    // URL base do StreamControl
                    var urlDownloadDireto = "/webdesk/streamcontrol/" +
                        "?WDCompanyId=" + companyId +
                        "&WDNrDocto=" + docId +
                        "&WDNrVersao=" + version;

                    // --- TRUQUE PARA FORÇAR O DOWNLOAD ---
                    // Cria um elemento <a> temporário
                    var link = document.createElement('a');
                    link.href = urlDownloadDireto;

                    // O atributo 'download' força o navegador a salvar em vez de abrir
                    // Usamos o nome que estava salvo no formulário
                    link.download = nomeArquivoEsperado || ("Anexo_Processo_" + numProcesso);

                    document.body.appendChild(link);
                    link.click(); // Simula o clique
                    document.body.removeChild(link); // Limpa

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

// 1. Função para preparar o arquivo no GED (Etapa Inicial)
function enviarArquivoParaAnexos(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];

        try {
            // Verifica se a interface de anexos do Fluig está disponível (Padrão Web)
            if (window.parent && window.parent.WKFViewAttachment) {

                // Adiciona o arquivo diretamente à fila de anexos do processo
                window.parent.WKFViewAttachment.addItems([file]);

                FLUIGC.toast({
                    title: 'Anexado',
                    message: 'Arquivo vinculado à aba de anexos do processo com sucesso.',
                    type: 'success'
                });

                // Atualiza o texto do e-mail (Atividade 12) se necessário
                if (typeof gerarTextoEmail === 'function') {
                    gerarTextoEmail();
                }

            } else {
                // Fallback para Mobile ou caso o objeto não exista
                FLUIGC.toast({
                    title: 'Atenção',
                    message: 'Não foi possível vincular automaticamente. Por favor, clique no clipe de papel (Anexos) e adicione o arquivo manualmente.',
                    type: 'warning'
                });
            }
        } catch (e) {
            console.error("Erro ao tentar anexar via script:", e);
            FLUIGC.toast({
                title: 'Erro',
                message: 'Falha ao vincular anexo. Adicione manualmente na aba Anexos.',
                type: 'danger'
            });
        }
    }
}

// Função para a GUIA (Apenas anexa, não precisa ler conteúdo)
function anexarArquivoGuiaNativo() {
    try {
        // O JSInterface é o objeto que comunica o formulário com o container do Fluig
        // O parâmetro é o nome sugerido para o arquivo
        JSInterface.showCamera("Guia_Pagamento.pdf");

        // Atualiza visualmente para o usuário saber que deve ter anexado
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

// Função Auxiliar para tentar outro endpoint caso o primeiro falhe
function tentarUploadSintaxeAlternativa(file) {
    $.ajax({
        url: '/portal/api/rest/wcmservices/rest/content/uploadAttachment/' + file.name,
        type: 'POST',
        data: file,
        processData: false,
        contentType: "application/octet-stream",
        success: function () {
            FLUIGC.toast({ title: 'GED', message: 'Ficheiro carregado via redundância.', type: 'success' });
            gerarTextoEmail();
        },
        error: function () {
            FLUIGC.toast({ title: 'Erro Crítico', message: 'Não foi possível carregar o anexo. Contacte o suporte.', type: 'danger' });
        }
    });
}

// Esta função é chamada automaticamente pelo Fluig após um anexo ser adicionado
// function onFileSelected(file) {
//     $("#fileNameVisual").val(file.name); //

//     // Como o ficheiro já foi enviado para o servidor, 
//     // agora podemos lê-lo para processar a validação (CNAB)
//     var reader = new FileReader();
//     reader.onload = function (e) {
//         processarConteudo(e.target.result); //
//     };
//     reader.readAsText(file, "ISO-8859-1");
// }

// custom.js

function processarEAnexarUnificado(inputElement) {
    if (inputElement.files && inputElement.files[0]) {
        var file = inputElement.files[0];
        $("#fileNameVisual").val(file.name);

        // 1. Leitura para validação CNAB (Sua lógica atual)
        var reader = new FileReader();
        reader.onload = function (e) {
            processarConteudo(e.target.result);

            // 2. Disparar o Upload Nativo do Fluig (Lógica Bruno Gasparetto)
            // Em vez de AJAX, usamos o componente que o Fluig já tem pronto e logado
            var $fileInputClone = parent.$("#ecm-navigation-inputFile-clone");

            if ($fileInputClone.length) {
                // Configuramos o clone com os dados do seu arquivo
                $fileInputClone.attr({
                    "data-on-camera": "true",
                    "data-file-name-camera": file.name,
                    "data-inputid": "fileNameVisual", // ID do campo que receberá o nome
                    "data-filename": file.name,
                    "multiple": false
                });

                // Aqui está o segredo: enviamos o arquivo para o componente pai 
                // e disparamos o evento de adição dele
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

function anexarNoGed(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];

        // Exibe o nome no campo visual
        $("#fileNameVisual").val(file.name);

        // Função nativa do Fluig para anexar arquivos via formulário
        // Isso coloca o arquivo na lista de anexos que serão salvos no envio do processo
        parent.WCMAPI.Create({
            url: '/portal/api/rest/wcmservices/rest/content/uploadAttachment',
            contentType: "application/octet-stream",
            data: file,
            processData: false,
            success: function () {
                FLUIGC.toast({
                    title: 'Sucesso',
                    message: 'Arquivo preparado para o GED. Ele aparecerá nos anexos após o envio.',
                    type: 'success'
                });
            },
            error: function () {
                console.error("Erro ao preparar anexo para o GED");
            }
        });
    }
}

// =================================================================================
// VERIFICAÇÃO DE DUPLICIDADE (INTEGRADA COM DATASET CUSTOMIZADO)
// =================================================================================

function verificarDisponibilidadeID(coligada, idLan) {
    var filial = $("#cod_filial").val();
    var solicitacaoAtual = $("#cpNumeroSolicitacao").val() || "0";

    if (!filial) {
        // Se não tiver filial, não bloqueia, mas avisa no log
        console.warn("Filial vazia, pulando verificação.");
        buscarDadosFinanceiros(idLan);
        return;
    }

    var loading = FLUIGC.loading(window);
    loading.show();

    // Constraints (sem OPERACAO, ele assume VERIFICAR)
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
    // Limpa o campo para impedir o uso
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
        $("#container_resumo_cnab").show(); // Exibe Resumo CNAB

        $("#row_guia_header").hide();
        $("#painel_multi_lancamentos").hide();
        $("#painel_consolidado_guia").hide();
        $("#container_resumo_guia").hide(); // Oculta Resumo Guia

    } else {
        $("#campos_originais_cnab").hide();
        $("#row_cnab_inputs").hide();
        $("#painel_leitura").hide();
        $("#painel_erp").hide();
        $("#painel_rateio").hide();
        $("#container_resumo_cnab").hide(); // Oculta Resumo CNAB

        $("#row_guia_header").show();
        $("#painel_multi_lancamentos").show();
        $("#painel_consolidado_guia").show();
        $("#container_resumo_guia").show(); // Exibe Resumo Guia
    }

    // Reseta validações ao trocar
    limparCamposFinanceiros();
}

// Adiciona um novo card de lançamento para Guia/Outros
function adicionarCardGuia() {
    // 1. Cria o filho (Fluig adiciona ao final)
    var index = wdkAddChild('tbl_lancamentos_guia');

    // 2. Inicializa máscaras (se houver campos com mask)
    if (window.MaskEvent) MaskEvent.init();

    // 3. EMPILHAMENTO INVERSO (LIFO)
    // Pega o input gerado
    var inputRecemCriado = $("input[name='card_id_lan___" + index + "']");
    if (inputRecemCriado.length > 0) {
        var novaLinha = inputRecemCriado.closest("tr");
        var tbody = novaLinha.closest("tbody");

        // Move a nova linha para o topo
        tbody.prepend(novaLinha);

        // Efeito visual de destaque (Flash verde)
        novaLinha.find(".panel").css("background-color", "#dff0d8").animate({ backgroundColor: "#fff" }, 1000);
    }
}

function toggleCard(btn) {
    // Encontra o corpo do card relativo ao botão clicado
    var cardBody = $(btn).closest(".panel").find(".panel-body.body-card-collapse");
    var icon = $(btn).find("i");
    var resumo = $(btn).closest(".panel-heading").find(".resumo-card");

    // Recupera dados para mostrar no resumo quando encolhido
    var linha = $(btn).closest("tr");
    var idLan = linha.find("input[name^='card_id_lan']").val();
    var valor = linha.find("input[name^='card_valor']").val();
    var historico = linha.find("input[name^='card_historico']").val();

    if (cardBody.is(":visible")) {
        // ENCOLHER
        cardBody.slideUp();
        icon.removeClass("flaticon-chevron-up").addClass("flaticon-chevron-down");

        // Monta texto de resumo
        if (idLan) {
            var textoResumo = "ID: " + idLan + " | R$ " + valor + " - " + historico.substring(0, 30) + "...";
            resumo.text(textoResumo).fadeIn();
        }
    } else {
        // EXPANDIR
        cardBody.slideDown();
        icon.removeClass("flaticon-chevron-down").addClass("flaticon-chevron-up");
        resumo.fadeOut();
    }
}

// Adiciona uma nova linha na tabela de lançamentos
function adicionarNovoLancamento() {
    var index = wdkAddChild('tbl_lancamentos');
    return index;
}

// Dispara o Zoom de empresa para o card específico
function zoomEmpresaCard(element) {
    // Pega o índice da linha atual (ex: card_empresa___1 -> 1)
    var index = element.id ? element.id.split("___")[1] : $(element).closest("tr").find("input")[0].name.split("___")[1];

    // Fallback se o botão não tiver ID mas estiver dentro da estrutura
    if (!index) {
        var inputName = $(element).closest(".input-group").find("input").attr("name");
        index = inputName.split("___")[1];
    }

    var zoom = new Zoom();
    zoom.Id = "ZoomEmpresaCard_" + index;
    zoom.Titulo = "Buscar Empresa (Card)";
    zoom.DataSet = "DS_FLUIG_0065"; // Seu dataset de empresas
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" },
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        $("#card_empresa___" + index).val(linha[1] + " - " + linha[3]); // Nome Empresa - Filial
        $("#card_cod_coligada___" + index).val(linha[0]);
        $("#card_cod_filial___" + index).val(linha[2]);
        $("#card_cnpj___" + index).val(linha[4]);

        // Limpa campos do card se trocar empresa
        $("#card_id_lan___" + index).val("");
        $("#card_historico___" + index).val("");
        $("#card_valor___" + index).val("");
        $("#tbody_rateio_card___" + index).empty(); // Limpa rateio visual
    };
    zoom.Abrir();
}

// Busca os dados do ERP para o ID LAN do card atual
function buscarDadosCard(element) {
    var idLan = $(element).val();
    // Recupera o índice pelo nome do campo (Fluig padrão)
    var index = element.name.split("___")[1];

    // RECUPERA O CONTEXTO DA LINHA (IMPORTANTE)
    var rowContext = $(element).closest("tr");

    // Busca os campos RELATIVOS à linha atual
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

            // Preenche usando ID sufixado (inputs do Fluig funcionam com ID sufixado)
            $("#card_historico___" + index).val(row["HISTORICO"]);
            $("#card_valor___" + index).val(formatarValorMonetario(row["VALOR"]));
            $("#card_data_venc___" + index).val(formatarDataISO(row["DTVENCIMENTO"]));
            $("#card_data_emissao___" + index).val(formatarDataISO(row["DTEMISSAO"]));

            // CHAMADA ATUALIZADA: Passa rowContext
            buscarRateioVisual(coligada, idLan, index, rowContext);

            atualizarResumoGuia(); // Atualiza o resumo geral dos lançamentos

            FLUIGC.toast({ title: 'Sucesso', message: 'Dados carregados.', type: 'success' });
        } else {
            FLUIGC.toast({ title: 'Erro', message: 'ID LAN não encontrado.', type: 'danger' });
            $("#card_historico___" + index).val("");
            $("#card_valor___" + index).val("");
            // Limpa tabela visual usando classe
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

// Busca e renderiza o rateio para o card específico
function buscarRateioVisual(coligada, idLan, index, rowContext) {
    // Garante que temos o contexto da linha
    if (!rowContext) {
        rowContext = $("[name='card_id_lan___" + index + "']").closest("tr");
    }

    // Busca Dataset
    var c1 = DatasetFactory.createConstraint("CODCOLIGADA", coligada, coligada, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST);
    var dsRateio = DatasetFactory.getDataset("DS_FLUIG_0067", null, [c1, c2], null);

    // SELETORES POR CLASSE DENTRO DA LINHA
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

        // Salva JSON no input hidden (esse tem ID sufixado pelo Fluig, então ID funciona)
        $("#card_json_rateio___" + index).val(JSON.stringify(listaRateio));

        // ATUALIZA VISUAL
        var totalPercFixo = parseFloat(totalPercentual.toFixed(2));
        var totalValorFixo = formatarValorMonetario(totalValor);

        lblPerc.text(totalPercFixo + "%");
        lblValor.text(totalValorFixo);

        // Cores de Validação
        if (totalPercFixo === 100) lblPerc.css("color", "#28a745");
        else lblPerc.css("color", "#dc3545");

        // Compara com valor do cabeçalho
        var valorCabecalho = $("#card_valor___" + index).val();
        if (valorCabecalho === totalValorFixo) lblValor.css("color", "#28a745");
        else lblValor.css("color", "#dc3545");

    } else {
        tbody.append("<tr><td colspan='3' class='text-center text-warning'>Nenhum rateio encontrado.</td></tr>");
        lblPerc.text("0%");
        lblValor.text("0,00");
    }
}

// Dispara o Zoom de empresa para uma linha específica da tabela
function zoomEmpresaItem(el) {
    var index = el.name.split("___")[1];
    var zoom = new Zoom();
    zoom.Id = "ZoomEmpresaItem_" + index;
    zoom.Titulo = "Buscar Empresa";
    zoom.DataSet = "DS_FLUIG_0065";

    // Colunas idênticas ao zoom global do CNAB
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" },
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        // linha[0] = CODCOLIGADA, linha[1] = EMPRESA, linha[2] = CODFILIAL, linha[3] = FILIAL
        $("[name='item_empresa___" + index + "']").val(linha[1]); // Apenas o nome da empresa
        $("[name='item_cod_coligada___" + index + "']").val(linha[0]);
        $("[name='item_cod_filial___" + index + "']").val(linha[2]);

        // Se desejar exibir Filial na linha como no CNAB:
        // $("[name='item_filial___" + index + "']").val(linha[2] + " - " + linha[3]);
    };
    zoom.Abrir();
}

// Busca os dados do ERP para o ID LAN da linha atual
function buscarDadosItem(el) {
    var index = el.name.split("___")[1];
    var idLan = $(el).val();
    var coligada = $("[name='item_cod_coligada___" + index + "']").val();
    var filial = $("[name='item_cod_filial___" + index + "']").val();

    if (!coligada || idLan == "") return;

    var c1 = DatasetFactory.createConstraint("CODCOLIGADA", coligada, coligada, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("CODFILIAL", filial, filial, ConstraintType.MUST);
    var c3 = DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST);

    var ds = DatasetFactory.getDataset("DS_FLUIG_0066", null, [c1, c2, c3], null);
    if (ds && ds.values.length > 0) {
        var row = ds.values[0];
        $("[name='item_historico___" + index + "']").val(row["HISTORICO"]);
        $("[name='item_valor___" + index + "']").val(formatarValorMonetario(row["VALOR"]));
        $("[name='item_data_venc___" + index + "']").val(formatarDataISO(row["DTVENCIMENTO"]));

        // Busca o rateio para o resumo (como já fazíamos no cnab)
        buscarResumoRateioItem(coligada, idLan, index);
    }
}

// Busca o rateio e monta uma string para o campo de resumo da linha
function buscarResumoRateioItem(codColigada, idLan, index) {
    var c1 = DatasetFactory.createConstraint("CODCOLIGADA", codColigada, codColigada, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("IDLAN", idLan, idLan, ConstraintType.MUST);
    var dsRateio = DatasetFactory.getDataset("DS_FLUIG_0067", null, [c1, c2], null);

    if (dsRateio && dsRateio.values.length > 0) {
        var resumo = "";
        for (var i = 0; i < dsRateio.values.length; i++) {
            var r = dsRateio.values[i];
            resumo += r.CODCCUSTO + " (" + r.PERCENTUAL + "%) - R$ " + formatarValorMonetario(r.VALOR) + " | ";
        }
        $("[name='item_resumo_rateio___" + index + "']").val(resumo.substring(0, resumo.length - 3));
    }
}

function zoomEmpresaERP() {
    var zoom = new Zoom(); //
    zoom.Id = "ZoomEmpresaERP";
    zoom.Titulo = "Buscar Empresa";
    zoom.DataSet = "DS_FLUIG_0065";

    // Colunas idênticas ao zoom original do CNAB
    zoom.Colunas = [
        { title: "Cód. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "Cód. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" },
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        // Preenche os campos do painel ERP usando os IDs originais
        $("#erp_empresa").val(linha[0] + " - " + linha[1]);
        $("#cod_empresa").val(linha[0]); // Mantém os campos de filtro originais
        $("#cod_filial").val(linha[2]);
        $("#erp_cnpj").val(linha[4]);

        // Limpa os dados financeiros para uma nova busca
        $("#erp_id_lan, #erp_historico, #erp_valor, #erp_data_cred, #erp_data_emissao").val("");

        validarDivergencias(); //
    };
    zoom.Abrir(); //
}

// =================================================================================
// LOGICA DE RESUMO / CONSOLIDADO DA GUIA
// =================================================================================

// 1. Função wrapper para Remover Card e atualizar totais
function removerCardGuia(oElement) {
    fnWdkRemoveChild(oElement);
    // Pequeno delay para garantir que o DOM removeu a linha antes de recalcular
    setTimeout(function () {
        atualizarResumoGuia();
    }, 200);
}

// 2. Função Principal de Cálculo do Resumo
function atualizarResumoGuia() {
    var tbody = $("#tbody_resumo_guia");
    tbody.empty();

    var totalAcumulado = 0.00;
    var listaDatas = [];

    // 1. ITERAÇÃO E SOMA
    $("input[name^='card_id_lan___']").each(function () {
        var index = this.name.split("___")[1];
        var idLan = $(this).val();
        var valorStr = $("#card_valor___" + index).val();
        var dataCard = $("#card_data_venc___" + index).val();

        // Recupera dados de Coligada e Filial
        var codColigada = $("#card_cod_coligada___" + index).val() || "";
        var codFilial = $("#card_cod_filial___" + index).val() || "";
        var empFilialRaw = $("#card_empresa___" + index).val(); // "Empresa - Filial"
        var nomeFilial = "";

        // Extrai apenas o nome da filial do campo composto
        if (empFilialRaw && empFilialRaw.indexOf(" - ") > -1) {
            nomeFilial = empFilialRaw.split(" - ")[1];
        } else {
            nomeFilial = empFilialRaw;
        }

        // Monta a string: COD_COLIGADA - COD_FILIAL - NOME_FILIAL
        var textoColigadaFilial = codColigada + " - " + codFilial + " - " + nomeFilial;

        if (idLan && valorStr) {
            var valorFloat = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
            if (!isNaN(valorFloat)) totalAcumulado += valorFloat;

            if (dataCard) listaDatas.push(dataCard);

            // ADICIONA LINHA (ORDEM: ID LAN | COLIGADA-FILIAL | VALOR)
            var tr = "<tr>" +
                "<td>" + idLan + "</td>" +
                "<td>" + textoColigadaFilial + "</td>" +
                "<td class='text-right'>" + valorStr + "</td>" +
                "</tr>";
            tbody.append(tr);
        }
    });

    // 2. ATUALIZA VISUAL DA SOMA
    var totalFormatado = formatarValorMonetario(totalAcumulado);
    $("#lbl_total_consolidado").text(totalFormatado);

    // 3. CHAMA A VALIDAÇÃO
    validarGuiaCompleta(totalFormatado, listaDatas);
}

// Função Centralizada de Validação da Guia
function validarGuiaCompleta(totalItens, listaDatas) {
    var temDivergencia = false;
    var qtdItens = listaDatas.length; // Quantidade de cards adicionados

    var valorCabecalho = $("#guia_valor_total").val();
    var statusValor = $("#status_guia_valor");
    var detalheValor = $("#detalhe_guia_valor");

    var dataCabecalhoRaw = $("#guia_data_venc").val();
    var statusData = $("#status_guia_data");
    var detalheData = $("#detalhe_guia_data");

    // =========================================================================
    // CENÁRIO 1: SEM ITENS (Estado Neutro)
    // =========================================================================
    if (qtdItens === 0) {
        // Se tem cabeçalho mas não tem itens, apenas avisa para adicionar
        if (valorCabecalho || dataCabecalhoRaw) {
            definirStatus(statusValor, detalheValor, "AGUARDANDO", "Adicione os títulos abaixo.", "black");
            definirStatus(statusData, detalheData, "AGUARDANDO", "Adicione os títulos abaixo.", "black");
        } else {
            // Se nem cabeçalho tem, limpa tudo
            definirStatus(statusValor, detalheValor, "", "", "black");
            definirStatus(statusData, detalheData, "", "", "black");
        }

        // RESET FINAL (Não é divergência, é apenas incompleto - validateForm cuida disso)
        $("#cpTemDivergencia").val("nao");
        $("#painel_consolidado_guia").removeClass("panel-warning").addClass("panel-primary");
        $("#check_ok").prop("disabled", false);
        return; // ENCERRA A FUNÇÃO AQUI
    }

    // =========================================================================
    // CENÁRIO 2: COM ITENS (Validação Real)
    // =========================================================================

    // --- 1. VALIDAÇÃO DE VALOR ---
    if (!valorCabecalho) {
        definirStatus(statusValor, detalheValor, "PENDENTE", "Informe o valor no cabeçalho.", "black");
    } else if (valorCabecalho === totalItens) {
        definirStatus(statusValor, detalheValor, "OK", "Valores conferem.", "green");
    } else {
        // CÁLCULO DA DIFERENÇA
        var valCabecalhoFloat = parseFloat(valorCabecalho.replace(/\./g, "").replace(",", ".")) || 0;
        var valItensFloat = parseFloat(totalItens.replace(/\./g, "").replace(",", ".")) || 0;
        var diferenca = valCabecalhoFloat - valItensFloat;
        var diferencaFmt = diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        var msgDivergencia = "Guia/Outros: " + valorCabecalho + " | Soma Quadro Contas a Pagar: " + totalItens + " (Dif: " + diferencaFmt + ")";

        definirStatus(statusValor, detalheValor, "DIVERGENTE", msgDivergencia, "red");
        temDivergencia = true;
    }

    // --- 2. VALIDAÇÃO DE DATA ---
    var dataCabecalhoPT = "";
    if (dataCabecalhoRaw) {
        var p = dataCabecalhoRaw.split("-");
        dataCabecalhoPT = p[2] + "/" + p[1] + "/" + p[0];
    }

    if (!dataCabecalhoPT) {
        definirStatus(statusData, detalheData, "PENDENTE", "Informe a data no cabeçalho.", "black");
    } else {
        var datasDiferentes = listaDatas.filter(function (d) { return d !== dataCabecalhoPT; });

        if (datasDiferentes.length === 0) {
            definirStatus(statusData, detalheData, "OK", "Todas as datas são: " + dataCabecalhoPT, "green");
        } else {
            // ALTERAÇÃO DA MENSAGEM DE DATA AQUI
            definirStatus(statusData, detalheData, "DIVERGENTE", "Há " + datasDiferentes.length + " título(s) com data diferente da Guia/Outros.", "red");
            temDivergencia = true;
        }
    }

    // --- 3. CONTROLE FINAL ---
    $("#check_ok").prop("disabled", false);

    if (temDivergencia) {
        $("#cpTemDivergencia").val("sim");
        $("#painel_consolidado_guia").removeClass("panel-primary").addClass("panel-warning");

        // Só exibe o toast se realmente houver divergência confirmada (evita spam ao digitar)
        // Opcional: remover o toast se achar muito intrusivo
        /* FLUIGC.toast({
            title: 'Atenção:',
            message: 'Valores ou datas não conferem.',
            type: 'warning'
        });
        */
    } else {
        $("#cpTemDivergencia").val("nao");
        $("#painel_consolidado_guia").removeClass("panel-warning").addClass("panel-primary");
    }

}

// Helper visual para pintar os inputs
function definirStatus(elInput, elDetalhe, texto, detalhe, cor) {
    elInput.val(texto);
    elDetalhe.text(detalhe).css("color", cor);

    if (cor === "green") {
        elInput.css({ "background-color": "#dff0d8", "color": "#3c763d", "border-color": "#d6e9c6" });
    } else if (cor === "red") {
        elInput.css({ "background-color": "#f2dede", "color": "#a94442", "border-color": "#ebccd1" });
    } else {
        elInput.css({ "background-color": "#fff", "color": "#333", "border-color": "#ccc" });
    }
}

// 3. Validação entre Soma dos Itens vs Cabeçalho
function validarTotalGuia(totalItensFormatado) {
    var valorCabecalho = $("#guia_valor_total").val(); // Campo que adicionamos no passo anterior

    if (!valorCabecalho || valorCabecalho === "") {
        $("#alert_divergencia_guia, #alert_sucesso_guia").hide();
        return;
    }

    $("#span_total_lanc").text(totalItensFormatado);
    $("#span_total_cabeca").text(valorCabecalho);

    // Comparação simples de string (já que ambos estão formatados iguais 0.000,00)
    if (totalItensFormatado === valorCabecalho) {
        $("#alert_divergencia_guia").hide();
        $("#alert_sucesso_guia").show();
        $("#lbl_total_consolidado").css("color", "#3c763d"); // Verde
    } else {
        $("#alert_sucesso_guia").hide();
        $("#alert_divergencia_guia").show();
        $("#lbl_total_consolidado").css("color", "#a94442"); // Vermelho
    }
}

// Controla o estado do botão de upload conforme seleção do banco
function controlarBotaoUpload() {
    var tipo = $("#tipo_documento").val();
    var codBanco = $("#cod_banco").val();
    var btn = $("#btn_upload_cnab");

    // Só aplica lógica de bloqueio se for CNAB. 
    // Se for Guia, o botão já estará oculto pelo ajustarInterfacePorTipo, então não mexemos.
    if (tipo === "cnab") {
        if (!codBanco || codBanco === "") {
            // Bloqueia
            btn.prop("disabled", true);
            btn.attr("title", "Selecione o Banco antes de anexar");
            btn.removeClass("btn-primary").addClass("btn-default");
        } else {
            // Libera
            btn.prop("disabled", false);
            btn.attr("title", "Localizar e Anexar Arquivo");
            btn.removeClass("btn-default").addClass("btn-primary");
        }
    }
}

// =================================================================================
// FUNÇÃO DE UPLOAD SIMPLES PARA GUIA (SEM LEITURA)
// =================================================================================
function anexarArquivoGuia(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];

        // 1. Atualiza o campo visual com o nome do arquivo
        $("#fileNameGuia").val(file.name);

        // 2. Envia para a área de upload do Fluig (Staging)
        // Isso garante que o arquivo seja persistido como anexo do processo ao enviar
        var formData = new FormData();
        formData.append("file", file);
        formData.append("filename", file.name);

        var loading = FLUIGC.loading(window);
        loading.show();

        $.ajax({
            url: '/portal/api/rest/wcmservices/rest/content/uploadAttachment',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                loading.hide();
                FLUIGC.toast({
                    title: 'Anexado',
                    message: 'Arquivo da Guia anexado com sucesso.',
                    type: 'success'
                });
            },
            error: function (err) {
                loading.hide();
                console.error("Erro no upload da Guia:", err);
                FLUIGC.toast({
                    title: 'Erro',
                    message: 'Falha ao anexar arquivo. Tente novamente.',
                    type: 'danger'
                });
                $("#fileNameGuia").val(""); // Limpa se der erro
            }
        });
    }
}

// =================================================================================
// 2. FUNÇÃO BEFORE SEND VALIDATE (Garante a gravação antes de enviar)
// =================================================================================
var beforeSendValidate = function (numState, nextState) {
    console.log(">>> Gerando Resumo Estático para Congelamento...");

    // Gera o HTML e salva no textarea
    gerarResumoEstatico();

    return true;
}

// =================================================================================
// 3. O GERADOR DE RELATÓRIO (A Mágica acontece aqui)
// =================================================================================
function gerarResumoEstatico() {
    var tipo = $("#tipo_documento").val();
    var html = "";

    // Estilos inline básicos para garantir formatação bonita
    var styleLabel = "font-weight:bold; color:#555;";
    var styleVal = "color:#000;";
    var styleBox = "border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:4px; background:#f9f9f9;";

    if (tipo == "cnab") {
        // --- BLOCO CNAB ---

        // A. Info Solicitação
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Informações da Solicitação</legend>";
        html += "<div class='row'>";
        html += col(4, "Empresa", $("#txt_empresa").val());
        html += col(4, "Filial", $("#txt_filial").val());
        html += col(4, "CNPJ", $("#txt_cnpj").val());
        html += "</div><div class='row'>";
        html += col(4, "Tipo Lançamento", $("#cnab_tipo_lancamento").val());
        html += col(4, "Banco", $("#txt_banco").val());
        html += col(4, "Arquivo", $("#fileNameVisual").val());
        html += "</div></div>";

        // B. Leitura Arquivo
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Dados Extraídos do Arquivo</legend>";
        html += "<div class='row'>";
        html += col(3, "Bco/Ag/CC", $("#arq_banco").val() + " / " + $("#arq_agencia").val() + " / " + $("#arq_conta").val());
        html += col(3, "Valor", "R$ " + $("#arq_valor").val());
        html += col(3, "Data Crédito", $("#arq_data_cred").val());
        html += col(3, "Empresa Arq", $("#arq_empresa").val());
        html += "</div></div>";

        // C. Dados ERP
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Dados ERP (Contas a Pagar)</legend>";
        html += "<div class='row'>";
        html += col(2, "IDLAN", "<strong>" + $("#erp_id_lan").val() + "</strong>");
        html += col(5, "Histórico", $("#erp_historico").val());
        html += col(3, "Valor ERP", "R$ " + $("#erp_valor").val());
        html += col(2, "Vencimento", $("#erp_data_cred").val());
        html += "</div></div>";

        // D. Rateio (Loop Pai x Filho)
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Rateio Financeiro</legend>";
        html += "<ul class='list-group'>";
        $("input[name^='rateio_cc___']").each(function () {
            var idx = this.name.split("___")[1];
            var cc = $(this).val();
            var perc = $("input[name='rateio_percentual___" + idx + "']").val();
            var val = $("input[name='rateio_valor___" + idx + "']").val();
            html += "<li class='list-group-item' style='padding:5px;'>Centro de Custo: <b>" + cc + "</b> | Percentual: <b>" + perc + "%</b> | Valor: <b>R$ " + val + "</b></li>";
        });
        html += "</ul>";
        html += "<div class='text-right'>Total: <b>R$ " + $("#rateio_total_calculado").val() + "</b> (" + $("#rateio_total_percentual").val() + "%)</div>";
        html += "</div>";

        // E. Validação e Justificativa
        html += "<div class='alert alert-warning'>";
        html += "<p><strong>Justificativa da Divergência:</strong> " + $("#txt_justificativa").val() + "</p>";
        html += "</div>";

    } else {
        // --- BLOCO GUIA ---

        // A. Info Guia
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Informações da Guia</legend>";
        html += "<div class='row'>";
        html += col(6, "Arquivo Comprovante", $("#fileNameGuia").val());
        html += col(6, "Tipo da Guia", $("#guia_tipo").val());
        html += "</div><div class='row'>";

        // Formata data
        var dataG = $("#guia_data_venc").val();
        if (dataG && dataG.includes("-")) dataG = dataG.split("-").reverse().join("/");

        html += col(6, "Data Vencimento", dataG);
        html += col(6, "Valor Total", "<span style='color:blue; font-weight:bold;'>R$ " + $("#guia_valor_total").val() + "</span>");
        html += "</div></div>";

        // B. Lançamentos (Tabela construída via loop)
        html += "<div style='" + styleBox + "'>";
        html += "<legend style='font-size:14px; font-weight:bold; border-bottom:1px solid #ccc;'>Lançamentos Vinculados</legend>";
        html += "<table class='table table-condensed table-striped table-bordered' style='background:white;'><thead><tr><th>ID LAN</th><th>Empresa</th><th>Histórico</th><th>Valor</th></tr></thead><tbody>";

        $("input[name^='card_id_lan___']").each(function () {
            var idx = this.name.split("___")[1];
            var id = $(this).val();
            if (id) {
                var emp = $("input[name='card_empresa___" + idx + "']").val();
                var hist = $("input[name='card_historico___" + idx + "']").val();
                var val = $("input[name='card_valor___" + idx + "']").val();
                html += "<tr><td>" + id + "</td><td>" + emp + "</td><td>" + hist + "</td><td align='right'>" + val + "</td></tr>";
            }
        });

        html += "</tbody><tfoot><tr><td colspan='3' align='right'><b>Total Consolidado:</b></td><td align='right'><b>R$ " + $("#lbl_total_consolidado").text() + "</b></td></tr></tfoot>";
        html += "</table></div>";

        // C. Status Validação
        var stVal = $("#status_guia_valor").val();
        var stDat = $("#status_guia_data").val();

        html += "<table class='table table-bordered'>";
        html += "<tr><td width='30%'>Validação Valor</td><td><b>" + stVal + "</b> (" + $("#detalhe_guia_valor").text() + ")</td></tr>";
        html += "<tr><td>Validação Data</td><td><b>" + stDat + "</b> (" + $("#detalhe_guia_data").text() + ")</td></tr>";
        html += "</table>";

        // D. Justificativa
        html += "<div class='alert alert-warning'>";
        html += "<p><strong>Justificativa:</strong> " + $("#txt_justificativa").val() + "</p>";
        html += "</div>";
    }

    // GRAVAÇÃO FINAL NO TEXTAREA
    $("#html_resumo_congelado").val(html);
}

// Helper para criar colunas Bootstrap HTML na string
function col(size, label, value) {
    if (!value) value = "-";
    return "<div class='col-md-" + size + "'><small style='color:#777'>" + label + "</small><br><strong>" + value + "</strong></div>";
}