// =================================================================================
// INÃCIO DO SCRIPT PRINCIPAL
// =================================================================================
$(document).ready(function () {

    // 1. DETECÃ‡ÃƒO DE CONTEXTO: ESTAMOS NA ATIVIDADE DE ENVIO (12)?
    var isAtividadeEnvio = $("#painel_email_rh").is(":visible");

    if (isAtividadeEnvio) {
        console.log(">>> Modo Envio Financeiro (Task 12) Detectado <<<");

        // A. BLINDAGEM DE INTERFACE
        $("#painel_info, #row_guia_header, #painel_leitura, #painel_erp, #painel_rateio").hide();
        $("#painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia").hide();
        $("#campos_originais_cnab, #row_cnab_inputs, #painel_resumo").hide();

        $("#btn_copiar_anexo").show();

        // B. GERAÃ‡ÃƒO AUTOMÃTICA DE E-MAIL
        setTimeout(function () {
            gerarTextoEmail();
        }, 500);

    } else {
        // =========================================================================
        // COMPORTAMENTO PADRÃƒO (INÃCIO, CORREÃ‡ÃƒO, ANÃLISE)
        // =========================================================================

        // 2. MONITORAMENTO DE TIPO DE DOCUMENTO
        $("#tipo_documento").change(function () {
            ajustarInterfacePorTipo($(this).val());
            controlarBotaoUpload();
            limparCamposFinanceiros();
        });

        // Executa ajuste inicial
        ajustarInterfacePorTipo($("#tipo_documento").val());
        controlarBotaoUpload();

        $("#btn_upload_cnab").click(function () {
            if ($("#tipo_documento").val() == "cnab" && !$("#cod_banco").val()) {
                FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Selecione o Banco antes de anexar o arquivo.', type: 'warning' });
                return;
            }
            $("#fileUpload").click();
        });

        // 3. RESTAURAÃ‡ÃƒO DE CORES/VALIDAÃ‡ÃƒO
        if ($("#erp_id_lan").val() && $("#erp_historico").val()) {
            console.log("Dados encontrados. Reaplicando validaÃ§Ã£o visual...");
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

        // 6. MONITORAMENTO DO ID LAN
        $("#erp_id_lan").off("blur").on("blur", function () {
            var idDigitado = $(this).val();
            var coligada = $("#cod_empresa").val();

            if (idDigitado && idDigitado.trim() !== "") {
                if (coligada) {
                    verificarDisponibilidadeID(coligada, idDigitado);
                } else {
                    FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Selecione a empresa antes de digitar o ID LAN.', type: 'warning' });
                    $(this).val("");
                }
            } else {
                limparCamposFinanceiros();
            }
        });

        // 7. CARGA DE CARD GUIA
        if ($("input[name^='card_id_lan___']").length > 0) {
            atualizarResumoGuia();
        }
    }

    // =========================================================================
    // LÃ“GICA DO PAINEL DE RESUMO ESTÃTICO (CONGELADO)
    // =========================================================================

    // Identifica atividade atual (campo hidden criado no HTML e populado pelo displayFields)
    var atividade = $("#wkNumState_hidden").val() || 0;

    // Verifica se jÃ¡ temos um resumo salvo
    var resumoSalvo = $("#html_resumo_congelado").val();

    // EXIBE O RESUMO APENAS SE: 
    // - NÃ£o for InÃ­cio (0) nem CorreÃ§Ã£o (4)
    // - NÃ£o for Envio Financeiro (12)
    // - NÃ£o for Validar DivergÃªncias (14)
    // - Tiver conteÃºdo salvo
    // (Basicamente: sÃ³ exibe em Modo de Consulta HistÃ³rica ou Processo Finalizado)

    if (atividade != 0 && atividade != 4 && atividade != 12 && atividade != 14 && atividade != 40 && resumoSalvo && resumoSalvo.trim() !== "") {

        console.log(">>> MODO CONSULTA: Exibindo Resumo Congelado <<<");

        // 1. Exibe o painel estÃ¡tico
        $("#painel_resumo_14").show();
        $("#conteudo_resumo_estatico").html(resumoSalvo);

        // POSICIONAMENTO: Move o painel de resumo para o topo (acima do painel de email se existir)
        $("#painel_resumo_14").insertBefore("#painel_email_rh");

        // 2. Oculta TODOS os painÃ©is de formulÃ¡rio originais para limpar a visÃ£o
        $("#painel_info, #painel_leitura, #painel_erp, #painel_rateio, #painel_resumo").hide();
        $("#painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia").hide();
        $("#campos_originais_cnab, #row_cnab_inputs, #row_guia_header").hide();
        $("#painel_email_rh").hide(); // Oculta tambÃ©m o painel de email na consulta histÃ³rica se desejar

    } else {
        // Durante o fluxo normal (0, 4, 12, 14), o resumo fica oculto
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

// Remove caracteres especiais para comparaÃ§Ã£o (pontos, traÃ§os, barras)
function limparCaracteres(valor) {
    if (!valor) return "";
    return valor.replace(/[\.\-\/]/g, "").trim();
}

// Extrai apenas o NOME se o campo estiver no formato "CÃ“DIGO - NOME"
function extrairNome(valor) {
    if (!valor) return "";
    if (valor.indexOf(" - ") > -1) {
        return valor.split(" - ")[1].trim();
    }
    return valor.trim();
}

// FunÃ§Ã£o para converter "2008-07-01T00:00:00" para "01/07/2008"
function formatarDataISO(dataISO) {
    if (!dataISO) return "";

    // Pega apenas a parte da data (YYYY-MM-DD) ignorando a hora
    var dataLimpa = dataISO.substring(0, 10);
    var partes = dataLimpa.split("-"); // Cria array: [2008, 07, 01]

    // Se tiver 3 partes, remonta como DD/MM/YYYY
    if (partes.length === 3) {
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    return dataISO; // Retorna original se nÃ£o estiver no padrÃ£o esperado
}

// FunÃ§Ã£o para converter "1813.4000" para "1.813,40"
function formatarValorMonetario(valor) {
    if (!valor) return "0,00";

    // Garante que Ã© um nÃºmero (limpa caracteres estranhos se houver)
    var numero = parseFloat(valor);

    // Se nÃ£o for nÃºmero vÃ¡lido, retorna zerado
    if (isNaN(numero)) return "0,00";

    // 1. Fixa em 2 casas decimais (Ex: 1813.4 -> "1813.40")
    // 2. Troca ponto por vÃ­rgula (Ex: "1813.40" -> "1813,40")
    // 3. Adiciona ponto de milhar usando Regex (Ex: "1813,40" -> "1.813,40")
    return numero.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

// =================================================================================
// 1. LÃ“GICA DE VALIDAÃ‡ÃƒO (Nova FunÃ§Ã£o)
// =================================================================================

function validarDivergencias() {
    console.log("Executando validaÃ§Ã£o cruzada (POR CÃ“DIGO DO BANCO)...");

    // Helper simples para limpar qualquer coisa que nÃ£o seja nÃºmero (ex: "341 - Itau" vira "341")
    function apenasNumeros(str) {
        if (!str) return "";
        // Pega apenas a parte numÃ©rica ou o primeiro bloco antes de um traÃ§o
        // Se vier "341", retorna "341". Se vier "341 - Itau", retorna "341".
        var partes = str.toString().split("-");
        return partes[0].replace(/[^0-9]/g, "");
    }

    // --- 1. CAPTURA DOS VALORES ---

    // Painel SolicitaÃ§Ã£o
    var reqEmpresa = extrairNome($("#txt_empresa").val());
    var reqCnpj = limparCaracteres($("#txt_cnpj").val());
    // MUDANÃ‡A: Pegamos o CODIGO escondido (campo hidden do zoom)
    var reqBancoCod = apenasNumeros($("#cod_banco").val());

    // Painel Arquivo
    var arqEmpresa = extrairNome($("#arq_empresa").val());
    var arqCnpj = limparCaracteres($("#arq_cnpj").val());
    // MUDANÃ‡A: Pegamos o CODIGO salvo no atributo data-codigo
    var arqBancoCod = apenasNumeros($("#arq_banco").val());

    var arqValor = $("#arq_valor").val();
    var arqData = $("#arq_data_cred").val();

    // Painel ERP
    var erpEmpresa = extrairNome($("#erp_empresa").val());
    var erpCnpj = limparCaracteres($("#erp_cnpj").val());
    // MUDANÃ‡A: Pegamos o valor direto do campo ERP (que vocÃª disse ser 341)
    var erpBancoCod = apenasNumeros($("#erp_banco").val());

    var erpValor = $("#erp_valor").val();
    var erpData = $("#erp_data_cred").val();

    // --- 2. REGRAS DE COMPARAÃ‡ÃƒO ---

    // A. EMPRESA
    var statusEmpresa = "PENDENTE";
    var msgEmpresa = "Aguardando preenchimento.";
    var corEmpresa = "black";

    if (reqEmpresa && arqEmpresa && erpEmpresa) {
        var nomeOk = (reqEmpresa.toUpperCase() === arqEmpresa.toUpperCase() && arqEmpresa.toUpperCase() === erpEmpresa.toUpperCase());

        if (nomeOk) {
            statusEmpresa = "OK";
            msgEmpresa = "RazÃ£o Social confere.";
            corEmpresa = "green";
        } else {
            statusEmpresa = "ATENÃ‡ÃƒO";
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
            msgCnpj = "CNPJ confere nos 3 painÃ©is.";
            corCnpj = "green";
        } else {
            statusCnpj = "ERRO";
            msgCnpj = "DivergÃªncia de CNPJ.";
            corCnpj = "red";
        }
    }

    // C. BANCO (VALIDAÃ‡ÃƒO POR CÃ“DIGO)
    var statusBanco = "PENDENTE";
    var msgBanco = "";
    var corBanco = "black";

    // Verifica se temos os 3 cÃ³digos
    if (reqBancoCod && arqBancoCod && erpBancoCod) {
        // Compara estritamente os nÃºmeros (ex: "341" == "341")
        if (reqBancoCod === arqBancoCod && arqBancoCod === erpBancoCod) {
            statusBanco = "OK";
            msgBanco = "CÃ³d. Banco (" + reqBancoCod + ") confere nos 3 painÃ©is.";
            corBanco = "green";
        } else {
            statusBanco = "ATENÃ‡ÃƒO";
            msgBanco = "DivergÃªncia: Solicit(" + reqBancoCod + ") x Arq(" + arqBancoCod + ") x ERP(" + erpBancoCod + ")";
            corBanco = "#d8b100";
        }
    }

    else if (reqBancoCod && arqBancoCod) {
        if (reqBancoCod === arqBancoCod) {
            // AJUSTE SOLICITADO: Se baterem, mas faltar ERP, avisa que estÃ¡ pendente/faltando campo
            statusBanco = "PENDENTE";
            msgBanco = "Falta o Banco no Quadro Contas a Pagar (Verifique o ERP).";
            corBanco = "#d8b100"; // Cor de atenÃ§Ã£o (Laranja/Amarelo escuro)
        } else {
            // Se jÃ¡ nÃ£o baterem entre si, mantÃ©m o aviso de divergÃªncia
            statusBanco = "ATENÃ‡ÃƒO";
            msgBanco = "DivergÃªncia: Solicit(" + reqBancoCod + ") x Arq(" + arqBancoCod + ")";
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

    // --- 3. ATUALIZAÃ‡ÃƒO VISUAL NA TABELA ---

    atualizarLinhaValidacao("chk_empresa", "msg_empresa", statusEmpresa, msgEmpresa, corEmpresa);
    atualizarLinhaValidacao("chk_cnpj", "msg_cnpj", statusCnpj, msgCnpj, corCnpj);

    // Atualiza o Banco
    atualizarLinhaValidacao("chk_banco", "msg_banco", statusBanco, msgBanco, corBanco);

    // Atualiza Valor e Data
    atualizarLinhaValidacao("chk_valor", "msg_valor", statusValor, (statusValor == "ERRO" ? "Valores Diferentes" : "Valores Iguais"), (statusValor == "OK" ? "green" : statusValor == "ERRO" ? "red" : "black"));
    atualizarLinhaValidacao("chk_data_cred", "msg_data_cred", statusData, (statusData == "ERRO" ? "Datas Diferentes" : "Datas Iguais"), (statusData == "OK" ? "green" : statusData == "ERRO" ? "red" : "black"));

    // LÃ³gica Final de DivergÃªncia
    // Aceita "OK" OU "ATENÃ‡ÃƒO" na empresa como vÃ¡lido para nÃ£o bloquear o fluxo
    if (statusBanco === "OK" && statusValor === "OK" && statusData === "OK") {

        if (statusEmpresa === "OK") {
            // Tudo 100%
            $("#cpTemDivergencia").val("nao");
        } else if (statusEmpresa === "ATENÃ‡ÃƒO") {
            // DivergÃªncia leve (Nome Empresa) -> Grava "aviso" para o painel
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
// 2. LÃ“GICA DE LEITURA DO ARQUIVO (CNAB / TXT)
// =================================================================================
// FunÃ§Ã£o Ajustada para o CNAB (LÃª para validar E pede para anexar)
// function lerArquivo(inputElement) {
//     if (inputElement.files && inputElement.files[0]) {
//         var file = inputElement.files[0];
//         $("#fileNameVisual").val(file.name);

//         var reader = new FileReader();
//         reader.onload = function (e) {
//             // 1. Processa e Valida (Chama a funÃ§Ã£o acima com o alerta do banco)
//             processarConteudo(e.target.result);

//             // 2. Solicita Anexo Manual (LÃ³gica Original "Voltou")
//             FLUIGC.message.alert({
//                 message: '<b>Leitura concluÃ­da!</b><br><br>' +
//                     'Para salvar o arquivo no processo, a janela de anexos serÃ¡ aberta.<br>' +
//                     'Por favor, <b>anexe o arquivo novamente</b> para confirmar.',
//                 title: 'AÃ§Ã£o NecessÃ¡ria',
//                 label: 'Anexar Agora'
//             }, function (el, ev) {
//                 // Abre a interface nativa de anexos/cÃ¢mera
//                 if (window.JSInterface && JSInterface.showCamera) {
//                     JSInterface.showCamera(file.name);
//                 } else {
//                     // Fallback se nÃ£o estiver no mobile/app
//                     FLUIGC.toast({ title: 'Anexo', message: 'Utilize o clipe de papel para anexar o arquivo.', type: 'info' });
//                 }
//             });
//         };
//         reader.readAsText(file, "ISO-8859-1");
//     }
// }

function processarConteudo(texto) {
    try {
        if (typeof BradescoStrategy === 'undefined') throw new Error("EstratÃ©gia JS nÃ£o encontrada.");
        var dados = BradescoStrategy.processar(texto);

        // 1. ValidaÃ§Ã£o de Alerta (DivergÃªncia Zoom x Arquivo)
        var codBancoZoom = $("#cod_banco").val();
        var codBancoArquivo = dados.codigoBanco;

        var bZoom = codBancoZoom ? codBancoZoom.replace(/[^0-9]/g, "") : "";
        var bArq = codBancoArquivo ? codBancoArquivo.replace(/[^0-9]/g, "") : "";

        if (bZoom && bArq && bZoom !== bArq) {
            FLUIGC.message.alert({
                message: '<b>ATENÃ‡ÃƒO: DIVERGÃŠNCIA DE BANCO!</b><br><br>' +
                    'No formulÃ¡rio: <b>' + bZoom + '</b><br>' +
                    'No arquivo: <b>' + bArq + '</b><br><br>' +
                    'Verifique se o arquivo anexo estÃ¡ correto.',
                title: 'Aviso de SeguranÃ§a',
                label: 'Estou Ciente'
            });
        }

        // 2. Preenchimento dos Campos
        $("#arq_empresa").val(dados.empresa);
        $("#arq_cnpj").val(dados.cnpj);

        // --- CORREÃ‡ÃƒO AQUI: Salvamos "CÃ“DIGO - NOME" no value para persistir no banco ---
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

        FLUIGC.toast({ title: 'Sucesso', message: 'Leitura concluÃ­da!', type: 'success' });

        validarDivergencias();
        if (($("#wkNumState_hidden").val() || "").toString() === "40" && typeof iniciarPainelVan40 === "function") {
            iniciarPainelVan40();
        }

    } catch (err) {
        FLUIGC.toast({ title: 'Erro', message: err.message, type: 'danger' });
    }
}

// =================================================================================
// 3. FUNÃ‡Ã•ES DE ZOOM
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
        { title: "CÃ³d. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "CÃ³d. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" }, // Nova coluna vinda do seu Dataset
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        // Como adicionamos uma coluna no meio (Ã­ndice 3), o Ã­ndice do CNPJ mudou para 4
        var codColigada = linha[0];
        var nomeEmpresa = linha[1];
        var codFilial = linha[2];
        var nomeFilial = linha[3]; // Novo valor recuperado
        var cnpj = linha[4];       // Ajustado Ã­ndice (era 3)

        $("#txt_empresa").val(codColigada + " - " + nomeEmpresa);
        $("#cod_empresa").val(codColigada);

        // 2. ALTERADA A CONCATENAÃ‡ÃƒO AQUI
        // Antes: $("#txt_filial").val(codFilial + " - " + nomeEmpresa);
        $("#txt_filial").val(codFilial + " - " + nomeFilial);

        $("#cod_filial").val(codFilial);
        $("#txt_cnpj").val(cnpj);

        // Limpa painel ERP ao trocar empresa
        var camposParaLimpar = ["erp_id_lan", "erp_historico", "erp_empresa", "erp_cnpj", "erp_banco", "erp_agencia", "erp_conta", "erp_data_emissao", "erp_data_cred", "erp_valor"];
        camposParaLimpar.forEach(function (id) { $("#" + id).val(""); });

        FLUIGC.toast({ title: 'Empresa Alterada', message: 'Selecione um novo ID LAN.', type: 'info' });

        // CHAMA VALIDAÃ‡ÃƒO
        validarDivergencias();
        if (($("#wkNumState_hidden").val() || "").toString() === "40" && typeof iniciarPainelVan40 === "function") {
            iniciarPainelVan40();
        }

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
        { title: "CÃ³d. Banco", name: "NUMBANCO" },
        { title: "Nome", name: "NOME" },
        { title: "Reduzido", name: "NOMEREDUZIDO", display: false }
    ];

    zoom.Retorno = function (linha) {
        var codBanco = linha[0];
        var nomeBanco = linha[1];
        $("#txt_banco").val(codBanco + " - " + nomeBanco);
        $("#cod_banco").val(codBanco);

        // CHAMA VALIDAÃ‡ÃƒO
        validarDivergencias();

        // Atualiza o botÃ£o de upload (caso esteja em CNAB)
        controlarBotaoUpload();
        if (($("#wkNumState_hidden").val() || "").toString() === "40" && typeof iniciarPainelVan40 === "function") {
            iniciarPainelVan40();
        }
    }
    zoom.Abrir();
}

// FunÃ§Ã£o para controlar o que aparece ou some na tela
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
    // CORREÃ‡ÃƒO: Usa os IDs globais (#cod_empresa) que valem tanto para CNAB quanto ERP
    var codColigada = $("#cod_empresa").val();
    var codFilial = $("#cod_filial").val();

    if (!codColigada || !codFilial) {
        // Tenta buscar pelo nome antigo caso tenha algum legado, senÃ£o avisa
        codColigada = $("#erp_cod_coligada").val();
        codFilial = $("#erp_cod_filial").val();

        if (!codColigada || !codFilial) {
            FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Selecione a Empresa (no cabeÃ§alho ou quadro ERP) antes de digitar o ID LAN.', type: 'warning' });
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

            // Preenche dados da empresa para confirmaÃ§Ã£o visual
            $("#erp_empresa").val(linha["EMPRESA"]);
            $("#erp_cnpj").val(linha["CNPJ"]);

            // Preenche o Banco
            $("#erp_banco").val(linha["BANCO"]);

            buscarRateio(codColigada, idLan);

            FLUIGC.toast({ title: 'Sucesso', message: 'TÃ­tulo encontrado.', type: 'success' });

            validarDivergencias();

        } else {
            FLUIGC.toast({ title: 'NÃ£o Encontrado', message: 'ID LAN nÃ£o encontrado nesta Empresa/Filial.', type: 'warning' });
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
    // Limpa apenas os campos do quadro ERP (exceto o ID LAN que o usuÃ¡rio digitou)
    var campos = ["erp_historico", "erp_valor", "erp_data_cred", "erp_empresa", "erp_cnpj", "erp_data_emissao"];
    campos.forEach(function (id) { $("#" + id).val(""); });

    // LIMPA A TABELA DE RATEIO TAMBÃ‰M
    limparTabelaRateio();

    // Reseta as validaÃ§Ãµes visuais para "Pendente"
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

                // Realiza a concatenaÃ§Ã£o: CÃ³digo - Nome
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

    // ValidaÃ§Ã£o Visual (Apenas Texto Colorido)
    var valorErp = $("#erp_valor").val();

    // Compara removendo formataÃ§Ã£o para garantir igualdade numÃ©rica
    // Mas para visualizaÃ§Ã£o rÃ¡pida, string exacta funciona bem se ambos estiverem formatados iguais
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
    // Seleciona todos os inputs que possuem o sufixo de Ã­ndice (___)
    // e remove a linha (TR) inteira correspondente.
    $("input[name^='rateio_cc___']").each(function () {
        fnWdkRemoveChild(this); // FunÃ§Ã£o nativa do Fluig para remover filho corretamente
    });
}

// =================================================================================
// 6. GERAÃ‡ÃƒO DE TEXTO PARA E-MAIL (ATIVIDADE RH)
// =================================================================================

// =================================================================================
// 6. GERAÃ‡ÃƒO DE TEXTO PARA E-MAIL (ATIVIDADE RH) - VERSÃƒO CUSTOMIZADA
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

    // VariÃ¡veis para o loop de itens
    var listaItens = [];

    // --- MODO CNAB ---
    if (tipoDoc == "cnab") {
        tipoLancamento = $("#cnab_tipo_lancamento").val() || "(Tipo nÃ£o informado)";

        var empRaw = $("#erp_empresa").val() || $("#txt_empresa").val();
        nomeEmpresa = extrairNome(empRaw);

        dataVenc = $("#erp_data_venc").val() || $("#erp_data_cred").val() || $("#arq_data_cred").val();
        valorTotal = $("#erp_valor").val() || $("#arq_valor").val();

        var bancoNome = $("#erp_banco").val() || $("#txt_banco").val();
        if (bancoNome && bancoNome.trim() !== "") {
            textoBanco = bancoNome;
        } else {
            textoBanco = "ERRO: BANCO NÃƒO INFORMADO / EM BRANCO";
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
        textoBanco = "Conforme Guias Anexas / MÃºltiplos";

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
    var corpo = "OlÃ¡,\n\n";
    corpo += "Segue pagamento " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + " validado e integrado com financeiro.\n\n";

    corpo += "Empresa: " + nomeEmpresa + "\n";
    corpo += "Banco: " + textoBanco + "\n";
    corpo += "Origem: Folha de Pagamento - " + (tipoDoc == "cnab" ? "CNAB" : "Guia") + " - " + tipoLancamento + "\n";
    corpo += "Vencimento: " + dataVenc + "\n";
    corpo += "Valor: R$ " + valorTotal + "\n\n";

    corpo += "Rateio LanÃ§amento Financeiro\n";
    corpo += "========================================\n";

    // Loop dos Itens (ORGANIZADO)
    for (var i = 0; i < listaItens.length; i++) {
        var item = listaItens[i];
        var indice = i + 1; // Contador (1, 2, 3...)

        // Linha Principal: IDLAN X: Dados...
        corpo += "IDLAN " + indice + ": " + item.idLan + " - " + item.codFilial + " - " + item.nomeFilial + " - R$ " + item.valor + "\n";

        // Linhas de Rateio (Indentadas com espaÃ§o para hierarquia)
        if (item.rateios && item.rateios.length > 0) {
            for (var j = 0; j < item.rateios.length; j++) {
                var rat = item.rateios[j];
                // Adicionei 3 espaÃ§os no inÃ­cio para recuar e ficar visualmente "dentro" do IDLAN
                corpo += "   Rateio: " + rat.cc + " -- R$ " + rat.valor + "\n";
            }
        } else {
            corpo += "   (Sem rateio detalhado)\n";
        }

        corpo += "\n"; // Linha em branco para separar do prÃ³ximo bloco
    }

    // 4. PREENCHIMENTO DOS CAMPOS
    $("#txt_assunto_email").val(assunto);
    $("#texto_email_resumo").val(corpo);
}

// function copiarTextoEmail() {
//     var copyText = document.getElementById("texto_email_resumo");
//     copyText.select();
//     copyText.setSelectionRange(0, 99999); /* Para mobile */
//     document.execCommand("copy");
//     FLUIGC.toast({ title: 'Copiado', message: 'Texto copiado para a Ã¡rea de transferÃªncia.', type: 'info' });
// }

// // FunÃ§Ã£o para copiar o Assunto
// function copiarAssuntoEmail() {
//     var copyText = document.getElementById("txt_assunto_email");
//     copyText.select();
//     copyText.setSelectionRange(0, 99999);
//     document.execCommand("copy");
//     FLUIGC.toast({ title: 'Copiado', message: 'Assunto copiado.', type: 'info' });
// }

// 2. FunÃ§Ã£o para baixar anexo (Task 12)
// function baixarAnexoValidado() {
//     var numProcesso = $("#cpNumeroSolicitacao").val();

//     // Recupera o nome original para salvar com o nome correto
//     var nomeArquivoEsperado = $("#tipo_documento").val() == "cnab"
//         ? $("#fileNameVisual").val()
//         : $("#fileNameGuia").val();

//     if (!numProcesso || numProcesso == "0") {
//         FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'SolicitaÃ§Ã£o ainda nÃ£o iniciada.', type: 'warning' });
//         return;
//     }

//     var loading = FLUIGC.loading(window);
//     loading.show();

//     // 1. Busca o ID do documento no Dataset
//     var c1 = DatasetFactory.createConstraint("processAttachmentPK.processInstanceId", numProcesso, numProcesso, ConstraintType.MUST);

//     DatasetFactory.getDataset("processAttachment", null, [c1], null, {
//         success: function (data) {
//             loading.hide();

//             if (data.values && data.values.length > 0) {
//                 var anexos = data.values.reverse(); // Pega o mais recente
//                 var anexoAlvo = null;

//                 for (var i = 0; i < anexos.length; i++) {
//                     var item = anexos[i];
//                     var tipo = item["documentType"];
//                     // Ignora pastas (2)
//                     if (tipo != "2" && tipo != 2) {
//                         anexoAlvo = item;
//                         break;
//                     }
//                 }

//                 if (anexoAlvo) {
//                     var docId = anexoAlvo["processAttachmentPK.documentId"] || anexoAlvo["documentId"];
//                     var companyId = anexoAlvo["processAttachmentPK.companyId"] || anexoAlvo["companyId"] || 1;
//                     var version = anexoAlvo["version"] || 1000;

//                     // URL base do StreamControl
//                     var urlDownloadDireto = "/webdesk/streamcontrol/" +
//                         "?WDCompanyId=" + companyId +
//                         "&WDNrDocto=" + docId +
//                         "&WDNrVersao=" + version;

//                     // --- TRUQUE PARA FORÃ‡AR O DOWNLOAD ---
//                     // Cria um elemento <a> temporÃ¡rio
//                     var link = document.createElement('a');
//                     link.href = urlDownloadDireto;

//                     // O atributo 'download' forÃ§a o navegador a salvar em vez de abrir
//                     // Usamos o nome que estava salvo no formulÃ¡rio
//                     link.download = nomeArquivoEsperado || ("Anexo_Processo_" + numProcesso);

//                     document.body.appendChild(link);
//                     link.click(); // Simula o clique
//                     document.body.removeChild(link); // Limpa

//                 } else {
//                     FLUIGC.toast({ title: 'Aviso', message: 'Nenhum arquivo vÃ¡lido encontrado.', type: 'warning' });
//                 }
//             } else {
//                 FLUIGC.toast({ title: 'Vazio', message: 'Nenhum anexo encontrado.', type: 'warning' });
//             }
//         },
//         error: function (msg) {
//             loading.hide();
//             FLUIGC.toast({ title: 'Erro', message: 'Falha ao buscar anexo.', type: 'danger' });
//         }
//     });
// }

// 1. FunÃ§Ã£o para preparar o arquivo no GED (Etapa Inicial)
function enviarArquivoParaAnexos(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];

        try {
            // Verifica se a interface de anexos do Fluig estÃ¡ disponÃ­vel (PadrÃ£o Web)
            if (window.parent && window.parent.WKFViewAttachment) {

                // Adiciona o arquivo diretamente Ã  fila de anexos do processo
                window.parent.WKFViewAttachment.addItems([file]);

                FLUIGC.toast({
                    title: 'Anexado',
                    message: 'Arquivo vinculado Ã  aba de anexos do processo com sucesso.',
                    type: 'success'
                });

                // Atualiza o texto do e-mail (Atividade 12) se necessÃ¡rio
                if (typeof gerarTextoEmail === 'function') {
                    gerarTextoEmail();
                }

            } else {
                // Fallback para Mobile ou caso o objeto nÃ£o exista
                FLUIGC.toast({
                    title: 'AtenÃ§Ã£o',
                    message: 'NÃ£o foi possÃ­vel vincular automaticamente. Por favor, clique no clipe de papel (Anexos) e adicione o arquivo manualmente.',
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

// FunÃ§Ã£o para a GUIA (Apenas anexa, nÃ£o precisa ler conteÃºdo)
function anexarArquivoGuiaNativo() {
    try {
        // O JSInterface Ã© o objeto que comunica o formulÃ¡rio com o container do Fluig
        // O parÃ¢metro Ã© o nome sugerido para o arquivo
        JSInterface.showCamera("Guia_Pagamento.pdf");

        // Atualiza visualmente para o usuÃ¡rio saber que deve ter anexado
        $("#fileNameGuia").val("Arquivo anexado via Clipe/Camera");

        FLUIGC.toast({
            title: 'AÃ§Ã£o NecessÃ¡ria',
            message: 'Se a janela de anexos abriu, selecione o arquivo e aguarde o upload.',
            type: 'info'
        });
    } catch (e) {
        console.error("JSInterface nÃ£o disponÃ­vel: " + e);
        FLUIGC.toast({
            title: 'AtenÃ§Ã£o',
            message: 'Utilize a aba de "Anexos" (Ã­cone de clipe) para incluir o arquivo.',
            type: 'warning'
        });
    }
}

// FunÃ§Ã£o Auxiliar para tentar outro endpoint caso o primeiro falhe
function tentarUploadSintaxeAlternativa(file) {
    $.ajax({
        url: '/portal/api/rest/wcmservices/rest/content/uploadAttachment/' + file.name,
        type: 'POST',
        data: file,
        processData: false,
        contentType: "application/octet-stream",
        success: function () {
            FLUIGC.toast({ title: 'GED', message: 'Ficheiro carregado via redundÃ¢ncia.', type: 'success' });
            gerarTextoEmail();
        },
        error: function () {
            FLUIGC.toast({ title: 'Erro CrÃ­tico', message: 'NÃ£o foi possÃ­vel carregar o anexo. Contacte o suporte.', type: 'danger' });
        }
    });
}

// Esta funÃ§Ã£o Ã© chamada automaticamente pelo Fluig apÃ³s um anexo ser adicionado
// function onFileSelected(file) {
//     $("#fileNameVisual").val(file.name); //

//     // Como o ficheiro jÃ¡ foi enviado para o servidor, 
//     // agora podemos lÃª-lo para processar a validaÃ§Ã£o (CNAB)
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

        // 1. Leitura para validaÃ§Ã£o CNAB (Sua lÃ³gica atual)
        var reader = new FileReader();
        reader.onload = function (e) {
            processarConteudo(e.target.result);

            // 2. Disparar o Upload Nativo do Fluig (LÃ³gica Bruno Gasparetto)
            // Em vez de AJAX, usamos o componente que o Fluig jÃ¡ tem pronto e logado
            var $fileInputClone = parent.$("#ecm-navigation-inputFile-clone");

            if ($fileInputClone.length) {
                // Configuramos o clone com os dados do seu arquivo
                $fileInputClone.attr({
                    "data-on-camera": "true",
                    "data-file-name-camera": file.name,
                    "data-inputid": "fileNameVisual", // ID do campo que receberÃ¡ o nome
                    "data-filename": file.name,
                    "multiple": false
                });

                // Aqui estÃ¡ o segredo: enviamos o arquivo para o componente pai 
                // e disparamos o evento de adiÃ§Ã£o dele
                var data = { files: [file] };
                parent.$("#ecm_navigation_fileupload").fileupload('add', data);

                FLUIGC.toast({
                    title: 'Sucesso',
                    message: 'Arquivo lido e anexado via componente nativo.',
                    type: 'success'
                });
            } else {
                console.error("Componente ecm-navigation-inputFile-clone nÃ£o encontrado no parent.");
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

        // FunÃ§Ã£o nativa do Fluig para anexar arquivos via formulÃ¡rio
        // Isso coloca o arquivo na lista de anexos que serÃ£o salvos no envio do processo
        parent.WCMAPI.Create({
            url: '/portal/api/rest/wcmservices/rest/content/uploadAttachment',
            contentType: "application/octet-stream",
            data: file,
            processData: false,
            success: function () {
                FLUIGC.toast({
                    title: 'Sucesso',
                    message: 'Arquivo preparado para o GED. Ele aparecerÃ¡ nos anexos apÃ³s o envio.',
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
// VERIFICAÃ‡ÃƒO DE DUPLICIDADE (INTEGRADA COM DATASET CUSTOMIZADO)
// =================================================================================

function verificarDisponibilidadeID(coligada, idLan) {
    var filial = $("#cod_filial").val();
    var solicitacaoAtual = $("#cpNumeroSolicitacao").val() || "0";

    if (!filial) {
        // Se nÃ£o tiver filial, nÃ£o bloqueia, mas avisa no log
        console.warn("Filial vazia, pulando verificaÃ§Ã£o.");
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
            console.error("Erro verificaÃ§Ã£o duplicidade:", errorThrown);
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
            'O ID LAN <b>' + idLan + '</b> jÃ¡ estÃ¡ em uso na solicitaÃ§Ã£o <b>' + solicitacao + '</b>, que ainda estÃ¡ em andamento.<br><br>' +
            'NÃ£o Ã© permitido pagar o mesmo tÃ­tulo em dois processos simultÃ¢neos.',
        title: 'Registro JÃ¡ Existente',
        labelYes: 'Ver SolicitaÃ§Ã£o Existente',
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

    // Reseta validaÃ§Ãµes ao trocar
    limparCamposFinanceiros();
}

// Adiciona um novo card de lanÃ§amento para Guia/Outros
function adicionarCardGuia() {
    // 1. Cria o filho (Fluig adiciona ao final)
    var index = wdkAddChild('tbl_lancamentos_guia');

    // 2. Inicializa mÃ¡scaras (se houver campos com mask)
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
    // Encontra o corpo do card relativo ao botÃ£o clicado
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

// Adiciona uma nova linha na tabela de lanÃ§amentos
function adicionarNovoLancamento() {
    var index = wdkAddChild('tbl_lancamentos');
    return index;
}

// Dispara o Zoom de empresa para o card especÃ­fico
function zoomEmpresaCard(element) {
    // Pega o Ã­ndice da linha atual (ex: card_empresa___1 -> 1)
    var index = element.id ? element.id.split("___")[1] : $(element).closest("tr").find("input")[0].name.split("___")[1];

    // Fallback se o botÃ£o nÃ£o tiver ID mas estiver dentro da estrutura
    if (!index) {
        var inputName = $(element).closest(".input-group").find("input").attr("name");
        index = inputName.split("___")[1];
    }

    var zoom = new Zoom();
    zoom.Id = "ZoomEmpresaCard_" + index;
    zoom.Titulo = "Buscar Empresa (Card)";
    zoom.DataSet = "DS_FLUIG_0065"; // Seu dataset de empresas
    zoom.Colunas = [
        { title: "CÃ³d. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "CÃ³d. Filial", name: "CODFILIAL" },
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
    // Recupera o Ã­ndice pelo nome do campo (Fluig padrÃ£o)
    var index = element.name.split("___")[1];

    // RECUPERA O CONTEXTO DA LINHA (IMPORTANTE)
    var rowContext = $(element).closest("tr");

    // Busca os campos RELATIVOS Ã  linha atual
    var coligada = rowContext.find("input[name^='card_cod_coligada']").val();
    var filial = rowContext.find("input[name^='card_cod_filial']").val();

    if (!idLan) return;

    if (!coligada || !filial) {
        FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Selecione a empresa do card antes de digitar o ID LAN.', type: 'warning' });
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

            atualizarResumoGuia(); // Atualiza o resumo geral dos lanÃ§amentos

            FLUIGC.toast({ title: 'Sucesso', message: 'Dados carregados.', type: 'success' });
        } else {
            FLUIGC.toast({ title: 'Erro', message: 'ID LAN nÃ£o encontrado.', type: 'danger' });
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

// Busca e renderiza o rateio para o card especÃ­fico
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

        // Salva JSON no input hidden (esse tem ID sufixado pelo Fluig, entÃ£o ID funciona)
        $("#card_json_rateio___" + index).val(JSON.stringify(listaRateio));

        // ATUALIZA VISUAL
        var totalPercFixo = parseFloat(totalPercentual.toFixed(2));
        var totalValorFixo = formatarValorMonetario(totalValor);

        lblPerc.text(totalPercFixo + "%");
        lblValor.text(totalValorFixo);

        // Cores de ValidaÃ§Ã£o
        if (totalPercFixo === 100) lblPerc.css("color", "#28a745");
        else lblPerc.css("color", "#dc3545");

        // Compara com valor do cabeÃ§alho
        var valorCabecalho = $("#card_valor___" + index).val();
        if (valorCabecalho === totalValorFixo) lblValor.css("color", "#28a745");
        else lblValor.css("color", "#dc3545");

    } else {
        tbody.append("<tr><td colspan='3' class='text-center text-warning'>Nenhum rateio encontrado.</td></tr>");
        lblPerc.text("0%");
        lblValor.text("0,00");
    }
}

// Dispara o Zoom de empresa para uma linha especÃ­fica da tabela
function zoomEmpresaItem(el) {
    var index = el.name.split("___")[1];
    var zoom = new Zoom();
    zoom.Id = "ZoomEmpresaItem_" + index;
    zoom.Titulo = "Buscar Empresa";
    zoom.DataSet = "DS_FLUIG_0065";

    // Colunas idÃªnticas ao zoom global do CNAB
    zoom.Colunas = [
        { title: "CÃ³d. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "CÃ³d. Filial", name: "CODFILIAL" },
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

        // Busca o rateio para o resumo (como jÃ¡ fazÃ­amos no cnab)
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

    // Colunas idÃªnticas ao zoom original do CNAB
    zoom.Colunas = [
        { title: "CÃ³d. Coligada", name: "CODCOLIGADA" },
        { title: "Empresa", name: "EMPRESA" },
        { title: "CÃ³d. Filial", name: "CODFILIAL" },
        { title: "Nome Filial", name: "FILIAL" },
        { title: "CNPJ", name: "CNPJ" }
    ];

    zoom.Retorno = function (linha) {
        // Preenche os campos do painel ERP usando os IDs originais
        $("#erp_empresa").val(linha[0] + " - " + linha[1]);
        $("#cod_empresa").val(linha[0]); // MantÃ©m os campos de filtro originais
        $("#cod_filial").val(linha[2]);
        $("#erp_cnpj").val(linha[4]);

        // Limpa os dados financeiros para uma nova busca
        $("#erp_id_lan, #erp_historico, #erp_valor, #erp_data_cred, #erp_data_emissao").val("");

        validarDivergencias(); //
        if (($("#wkNumState_hidden").val() || "").toString() === "40" && typeof iniciarPainelVan40 === "function") {
            iniciarPainelVan40();
        }
    };
    zoom.Abrir(); //
}

// =================================================================================
// LOGICA DE RESUMO / CONSOLIDADO DA GUIA
// =================================================================================

// 1. FunÃ§Ã£o wrapper para Remover Card e atualizar totais
function removerCardGuia(oElement) {
    fnWdkRemoveChild(oElement);
    // Pequeno delay para garantir que o DOM removeu a linha antes de recalcular
    setTimeout(function () {
        atualizarResumoGuia();
    }, 200);
}

// 2. FunÃ§Ã£o Principal de CÃ¡lculo do Resumo
function atualizarResumoGuia() {
    var tbody = $("#tbody_resumo_guia");
    tbody.empty();

    var totalAcumulado = 0.00;
    var listaDatas = [];

    // 1. ITERAÃ‡ÃƒO E SOMA
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

    // 3. CHAMA A VALIDAÃ‡ÃƒO
    validarGuiaCompleta(totalFormatado, listaDatas);
}

// FunÃ§Ã£o Centralizada de ValidaÃ§Ã£o da Guia
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
    // CENÃRIO 1: SEM ITENS (Estado Neutro)
    // =========================================================================
    if (qtdItens === 0) {
        // Se tem cabeÃ§alho mas nÃ£o tem itens, apenas avisa para adicionar
        if (valorCabecalho || dataCabecalhoRaw) {
            definirStatus(statusValor, detalheValor, "AGUARDANDO", "Adicione os tÃ­tulos abaixo.", "black");
            definirStatus(statusData, detalheData, "AGUARDANDO", "Adicione os tÃ­tulos abaixo.", "black");
        } else {
            // Se nem cabeÃ§alho tem, limpa tudo
            definirStatus(statusValor, detalheValor, "", "", "black");
            definirStatus(statusData, detalheData, "", "", "black");
        }

        // RESET FINAL (NÃ£o Ã© divergÃªncia, Ã© apenas incompleto - validateForm cuida disso)
        $("#cpTemDivergencia").val("nao");
        $("#painel_consolidado_guia").removeClass("panel-warning").addClass("panel-primary");
        $("#check_ok").prop("disabled", false);
        return; // ENCERRA A FUNÃ‡ÃƒO AQUI
    }

    // =========================================================================
    // CENÃRIO 2: COM ITENS (ValidaÃ§Ã£o Real)
    // =========================================================================

    // --- 1. VALIDAÃ‡ÃƒO DE VALOR ---
    if (!valorCabecalho) {
        definirStatus(statusValor, detalheValor, "PENDENTE", "Informe o valor no cabeÃ§alho.", "black");
    } else if (valorCabecalho === totalItens) {
        definirStatus(statusValor, detalheValor, "OK", "Valores conferem.", "green");
    } else {
        // CÃLCULO DA DIFERENÃ‡A
        var valCabecalhoFloat = parseFloat(valorCabecalho.replace(/\./g, "").replace(",", ".")) || 0;
        var valItensFloat = parseFloat(totalItens.replace(/\./g, "").replace(",", ".")) || 0;
        var diferenca = valCabecalhoFloat - valItensFloat;
        var diferencaFmt = diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        var msgDivergencia = "Guia/Outros: " + valorCabecalho + " | Soma Quadro Contas a Pagar: " + totalItens + " (Dif: " + diferencaFmt + ")";

        definirStatus(statusValor, detalheValor, "DIVERGENTE", msgDivergencia, "red");
        temDivergencia = true;
    }

    // --- 2. VALIDAÃ‡ÃƒO DE DATA ---
    var dataCabecalhoPT = "";
    if (dataCabecalhoRaw) {
        var p = dataCabecalhoRaw.split("-");
        dataCabecalhoPT = p[2] + "/" + p[1] + "/" + p[0];
    }

    if (!dataCabecalhoPT) {
        definirStatus(statusData, detalheData, "PENDENTE", "Informe a data no cabeÃ§alho.", "black");
    } else {
        var datasDiferentes = listaDatas.filter(function (d) { return d !== dataCabecalhoPT; });

        if (datasDiferentes.length === 0) {
            definirStatus(statusData, detalheData, "OK", "Todas as datas sÃ£o: " + dataCabecalhoPT, "green");
        } else {
            // ALTERAÃ‡ÃƒO DA MENSAGEM DE DATA AQUI
            definirStatus(statusData, detalheData, "DIVERGENTE", "HÃ¡ " + datasDiferentes.length + " tÃ­tulo(s) com data diferente da Guia/Outros.", "red");
            temDivergencia = true;
        }
    }

    // --- 3. CONTROLE FINAL ---
    $("#check_ok").prop("disabled", false);

    if (temDivergencia) {
        $("#cpTemDivergencia").val("sim");
        $("#painel_consolidado_guia").removeClass("panel-primary").addClass("panel-warning");

        // SÃ³ exibe o toast se realmente houver divergÃªncia confirmada (evita spam ao digitar)
        // Opcional: remover o toast se achar muito intrusivo
        /* FLUIGC.toast({
            title: 'AtenÃ§Ã£o:',
            message: 'Valores ou datas nÃ£o conferem.',
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

// 3. ValidaÃ§Ã£o entre Soma dos Itens vs CabeÃ§alho
function validarTotalGuia(totalItensFormatado) {
    var valorCabecalho = $("#guia_valor_total").val(); // Campo que adicionamos no passo anterior

    if (!valorCabecalho || valorCabecalho === "") {
        $("#alert_divergencia_guia, #alert_sucesso_guia").hide();
        return;
    }

    $("#span_total_lanc").text(totalItensFormatado);
    $("#span_total_cabeca").text(valorCabecalho);

    // ComparaÃ§Ã£o simples de string (jÃ¡ que ambos estÃ£o formatados iguais 0.000,00)
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

// Controla o estado do botÃ£o de upload conforme seleÃ§Ã£o do banco
function controlarBotaoUpload() {
    var tipo = $("#tipo_documento").val();
    var codBanco = $("#cod_banco").val();
    var btn = $("#btn_upload_cnab");

    // SÃ³ aplica lÃ³gica de bloqueio se for CNAB. 
    // Se for Guia, o botÃ£o jÃ¡ estarÃ¡ oculto pelo ajustarInterfacePorTipo, entÃ£o nÃ£o mexemos.
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
// FUNÃ‡ÃƒO DE UPLOAD SIMPLES PARA GUIA (SEM LEITURA)
// =================================================================================
function anexarArquivoGuia(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];

        // 1. Atualiza o campo visual com o nome do arquivo
        $("#fileNameGuia").val(file.name);

        // 2. Envia para a Ã¡rea de upload do Fluig (Staging)
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
// FUNÃ‡ÃƒO BEFORE SEND VALIDATE (Garante a gravaÃ§Ã£o)
// =================================================================================
var beforeSendValidate = function (numState, nextState) {
    console.log(">>> Gerando Resumo EstÃ¡tico para Congelamento...");
    gerarResumoEstatico();
    if (parseInt(numState, 10) === 12 && parseInt(nextState, 10) === 40 && typeof limparCamposTemporariosEnvioFinanceiro === "function") {
        limparCamposTemporariosEnvioFinanceiro();
    }
    if (parseInt(numState, 10) === 40 && typeof MonitoramentoVAN !== "undefined" && typeof MonitoramentoVAN.limparEstadoServidor === "function") {
        MonitoramentoVAN.limparEstadoServidor();
    }
    return true;
}

function limparCamposTemporariosEnvioFinanceiro() {
    var camposTexto = [
        "fileNameVan",
        "fileNameRetorno",
        "txt_aprovacao_40",
        "txt_parecer_aprovacao_40"
    ];

    camposTexto.forEach(function (id) {
        $("#" + id).val("");
    });

    $("#status_retorno_van").val("pendente");
    $("#origem_aprovacao_40").val("");

    $("input[name='flag_status_retorno']").prop("checked", false).prop("disabled", false);
    $("input[name='flag_status_geral']").prop("checked", false).prop("disabled", false);

    $("#lbl_van_empresa, #lbl_van_cnpj, #lbl_van_dados_bancarios, #lbl_van_convenio, #lbl_van_data, #lbl_van_valor").text("");
    $("#lbl_ret_empresa, #lbl_ret_cnpj, #lbl_ret_dados_bancarios, #lbl_ret_data, #lbl_ret_valor, #lbl_ret_arquivo").text("");
    $("#tabela_enviar_40_visual").empty();

    $("#resumo_van_extraido, #resumo_retorno_extraido, #painel_multipag_inline, #painel_lista_enviar_40").hide();
    $("#painel_multipag_inline").empty();
    $("#bloco_parecer_aprovacao_40").hide();
    $("#txt_parecer_aprovacao_40").prop("required", false);

    $("#btn_download_retorno").hide();
    $("#btn_enviar_fileserver")
        .prop("disabled", false)
        .removeClass("btn-default")
        .addClass("btn-success")
        .html('<i class="flaticon flaticon-send"></i> Enviar para File Server');

    if (typeof conteudoArquivoParaEnvio !== "undefined") {
        conteudoArquivoParaEnvio = "";
    }

    if (typeof MonitoramentoVAN !== "undefined" && typeof MonitoramentoVAN.limparEstadoServidor === "function") {
        MonitoramentoVAN.limparEstadoServidor();
    }
}

// =================================================================================
// O GERADOR DE RELATÃ“RIO (MODIFICADO - CORREÃ‡ÃƒO UNDEFINED)
// =================================================================================
function gerarResumoEstatico() {
    var tipo = $("#tipo_documento").val();
    var html = "";

    // Estilos inline para formataÃ§Ã£o
    var styleBox = "border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:4px; background:#f9f9f9;";
    var styleTitle = "font-size:14px; font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:10px; padding-bottom:5px;";

    if (tipo == "cnab") {
        // --- BLOCO CNAB ---

        // A. Info SolicitaÃ§Ã£o
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>InformaÃ§Ãµes da SolicitaÃ§Ã£o</div>";
        html += "<div class='row'>";
        html += col(4, "Empresa", $("#txt_empresa").val());
        html += col(4, "Filial", $("#txt_filial").val());
        html += col(4, "CNPJ", $("#txt_cnpj").val());
        html += "</div><div class='row'>";
        html += col(4, "Tipo Documento", "CNAB BancÃ¡rio");
        html += col(4, "Tipo LanÃ§amento", $("#cnab_tipo_lancamento").val());
        html += col(4, "Banco Pagamento", $("#txt_banco").val());
        html += "</div><div class='row'>";
        html += col(12, "Arquivo", $("#fileNameVisual").val());
        html += "</div></div>";

        // B. Leitura Arquivo
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>Dados ExtraÃ­dos do Arquivo</div>";
        html += "<div class='row'>";
        html += col(3, "Bco/Ag/CC", $("#arq_banco").val() + " / " + $("#arq_agencia").val() + " / " + $("#arq_conta").val());
        html += col(3, "Valor", "<span style='color:blue; font-weight:bold;'>R$ " + $("#arq_valor").val() + "</span>");
        html += col(3, "Data CrÃ©dito", $("#arq_data_cred").val());
        html += col(3, "Empresa Arq", $("#arq_empresa").val());
        html += "</div></div>";

        // C. Dados ERP
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>Dados ERP (Contas a Pagar)</div>";
        html += "<div class='row'>";
        html += col(2, "IDLAN", "<strong>" + $("#erp_id_lan").val() + "</strong>");
        html += col(5, "HistÃ³rico", $("#erp_historico").val());
        html += col(3, "Valor ERP", "R$ " + $("#erp_valor").val());
        html += col(2, "Vencimento", $("#erp_data_cred").val());
        html += "</div></div>";

        // D. Rateio
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>Rateio Financeiro</div>";
        html += "<ul class='list-group' style='margin-bottom:0;'>";
        $("input[name^='rateio_cc___']").each(function () {
            var idx = this.name.split("___")[1];
            var cc = $(this).val();
            var perc = $("input[name='rateio_percentual___" + idx + "']").val();
            var val = $("input[name='rateio_valor___" + idx + "']").val();
            html += "<li class='list-group-item' style='padding:5px;'>Centro de Custo: <b>" + cc + "</b> | Percentual: <b>" + perc + "</b> | Valor: <b>R$ " + val + "</b></li>";
        });
        html += "</ul>";
        html += "<div class='text-right' style='margin-top:5px;'>Total: <b>R$ " + $("#rateio_total_calculado").val() + "</b> (" + $("#rateio_total_percentual").val() + ")</div>";
        html += "</div>";

        // E. Resultado da ValidaÃ§Ã£o (CORRIGIDO)
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>Resultado da ValidaÃ§Ã£o</div>";
        html += "<table class='table table-condensed table-bordered' style='background:white; margin-bottom:0;'>";
        html += "<thead><tr><th>Item</th><th>Status</th><th>ObservaÃ§Ã£o / Detalhe</th></tr></thead><tbody>";

        // --- CORREÃ‡ÃƒO AQUI ---
        // Alterado para buscar por [name='...'] em vez de ID #
        function valRow(label, inputName, msgId) {
            var status = $("[name='" + inputName + "']").val(); // CORREÃ‡ÃƒO: Busca pelo name
            var msg = $("#" + msgId).text();

            // Tratamento visual para caso venha vazio ou undefined
            if (!status) status = "PENDENTE";

            var color = (status == "OK") ? "green" : (status == "ERRO" ? "red" : (status == "PENDENTE" ? "black" : "#d8b100"));
            var style = "font-weight:bold; color:" + color;
            return "<tr><td>" + label + "</td><td><span style='" + style + "'>" + status + "</span></td><td>" + msg + "</td></tr>";
        }

        html += valRow("Empresa", "chk_empresa", "msg_empresa");
        html += valRow("CNPJ", "chk_cnpj", "msg_cnpj");
        html += valRow("Banco", "chk_banco", "msg_banco");
        html += valRow("Data CrÃ©dito", "chk_data_cred", "msg_data_cred");
        html += valRow("Valor", "chk_valor", "msg_valor");

        html += "</tbody></table></div>";

        // F. Justificativa
        html += "<div class='alert alert-warning'>";
        html += "<p><strong>Justificativa da DivergÃªncia:</strong> " + ($("#txt_justificativa").val() || "Nenhuma") + "</p>";
        html += "</div>";

    } else {
        // --- BLOCO GUIA --- (Mantido igual)

        // A. Info Guia
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>InformaÃ§Ãµes da Guia</div>";
        html += "<div class='row'>";
        html += col(4, "Tipo Documento", "Guia / Outros");
        html += col(4, "Tipo da Guia", $("#guia_tipo").val());
        html += col(4, "Arquivo", $("#fileNameGuia").val());
        html += "</div><div class='row'>";

        var dataG = $("#guia_data_venc").val();
        if (dataG && dataG.includes("-")) dataG = dataG.split("-").reverse().join("/");

        html += col(6, "Data Vencimento", dataG);
        html += col(6, "Valor Total", "<span style='color:blue; font-weight:bold;'>R$ " + $("#guia_valor_total").val() + "</span>");
        html += "</div></div>";

        // B. LanÃ§amentos
        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>LanÃ§amentos Vinculados</div>";
        html += "<table class='table table-condensed table-striped table-bordered' style='background:white; margin-bottom:0;'><thead><tr><th>ID LAN</th><th>Empresa</th><th>HistÃ³rico</th><th class='text-right'>Valor</th></tr></thead><tbody>";

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

        // C. Status ValidaÃ§Ã£o
        var stVal = $("#status_guia_valor").val();
        var stDat = $("#status_guia_data").val();
        var cVal = (stVal == "OK") ? "green" : "red";
        var cDat = (stDat == "OK") ? "green" : "red";

        html += "<div style='" + styleBox + "'>";
        html += "<div style='" + styleTitle + "'>Resultado da ValidaÃ§Ã£o</div>";
        html += "<table class='table table-bordered' style='background:white; margin-bottom:0;'>";
        html += "<tr><td width='30%'>ValidaÃ§Ã£o Valor</td><td><b style='color:" + cVal + "'>" + stVal + "</b> (" + $("#detalhe_guia_valor").text() + ")</td></tr>";
        html += "<tr><td>ValidaÃ§Ã£o Data</td><td><b style='color:" + cDat + "'>" + stDat + "</b> (" + $("#detalhe_guia_data").text() + ")</td></tr>";
        html += "</table></div>";

        // D. Justificativa
        html += "<div class='alert alert-warning'>";
        html += "<p><strong>Justificativa:</strong> " + ($("#txt_justificativa").val() || "Nenhuma") + "</p>";
        html += "</div>";
    }

    $("#html_resumo_congelado").val(html);
}

// Helper colunas
function col(size, label, value) {
    if (!value) value = "-";
    return "<div class='col-md-" + size + "'><small style='color:#777'>" + label + "</small><br><strong>" + value + "</strong></div>";
}

// ============================================================
// MÃ“DULO: MONITORAMENTO DA PASTA 'ENVIADOS' (VERSÃƒO DEFINITIVA)
// ============================================================
var MonitoramentoVAN = (function () {
    var intervalo = null;
    var intervaloRevalidacaoSilenciosa = null;
    var periodoRevalidacaoSilenciosa = 45000;
    var arquivoMonitoradoSilencioso = "";

    var codificarEstadoMonitoramento = function (estadoCache) {
        return window.btoa(unescape(encodeURIComponent(JSON.stringify(estadoCache))));
    };

    var decodificarEstadoMonitoramento = function (stringBase64) {
        try {
            return JSON.parse(decodeURIComponent(escape(window.atob(stringBase64))));
        } catch (e) {
            return null;
        }
    };

    var montarResumoArquivo = function () {
        return {
            empresa: ($("#lbl_van_empresa").text() || "").trim(),
            cnpj: ($("#lbl_van_cnpj").text() || "").trim(),
            dadosBancarios: ($("#lbl_van_dados_bancarios").text() || "").trim(),
            convenio: ($("#lbl_van_convenio").text() || "").trim(),
            dataCredito: ($("#lbl_van_data").text() || "").trim(),
            valorTotal: ($("#lbl_van_valor").text() || "").trim()
        };
    };

    var obterUltimaPasta = function (status) {
        if (status === "CONSUMIDO_PELO_BANCO") return "Banco";
        if (status === "CONCLUIDO") return "Enviados";
        return "Enviar";
    };

    var montarEstadoCache = function (nomeArquivo, status) {
        return {
            status: status || "",
            conteudo: (typeof conteudoArquivoParaEnvio !== "undefined" && conteudoArquivoParaEnvio) ? conteudoArquivoParaEnvio : "",
            arquivo: nomeArquivo || "",
            origemPasta: "Enviar",
            ultimaPasta: obterUltimaPasta(status || ""),
            resumo: montarResumoArquivo(),
            dataHora: new Date().toISOString()
        };
    };

    var ocultarAvisosRevalidacao = function () {
        $("#aviso_envio_van_40").hide().text("");
    };

    var mostrarAvisoEnvio = function (texto) {
        $("#aviso_envio_van_40").text(texto).show();
    };

    var mostrarAvisoMonitoramento = function (texto) {
        $("#barra_progresso_van").hide();
        $("#painel_monitoramento_van").removeClass("panel-success").addClass("panel-info").show();
        $("#texto_monitoramento_van").html(texto);
    };

    var pararMonitoramentoSilenciosoControle = function () {
        if (intervaloRevalidacaoSilenciosa) {
            clearInterval(intervaloRevalidacaoSilenciosa);
            intervaloRevalidacaoSilenciosa = null;
        }
        arquivoMonitoradoSilencioso = "";
    };

    var lerConteudoArquivoFisico = function (nomeArquivo, pasta, callback) {
        var c1 = DatasetFactory.createConstraint("nomeArquivo", nomeArquivo, nomeArquivo, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("pasta", pasta, pasta, ConstraintType.MUST);
        var c3 = DatasetFactory.createConstraint("semFallback", "sim", "sim", ConstraintType.MUST);

        DatasetFactory.getDataset("DS_RESTAURAR_ARQUIVO_VAN", null, [c1, c2, c3], null, {
            success: function (ds) {
                if (ds && ds.values && ds.values.length > 0) {
                    var statusDataset = ds.values[0].status || ds.values[0].STATUS || "";
                    if (statusDataset && statusDataset.indexOf("ERRO") > -1) {
                        callback(statusDataset, "");
                        return;
                    }

                    var conteudo = ds.values.map(function (row) {
                        return row["conteudo"] || row["CONTEUDO"] || "";
                    }).join("\r\n");

                    callback(null, conteudo);
                } else {
                    callback("Arquivo vazio ou erro na leitura.", "");
                }
            },
            error: function (err) {
                callback("Erro ao acessar dataset de leitura: " + err, "");
            }
        });
    };

    var verificarArquivoNaPastaEnviar = function (nomeArquivo, callback) {
        var c1 = DatasetFactory.createConstraint("pasta", "Enviar", "Enviar", ConstraintType.MUST);
        DatasetFactory.getDataset("DS_LISTAR_RETORNOS", null, [c1], null, {
            success: function (ds) {
                var encontrado = false;

                if (ds && ds.values && ds.values.length > 0) {
                    if (!(ds.values[0]["Nome_do_Arquivo"] === "Aviso" || ds.values[0]["Nome_do_Arquivo"] === "Erro")) {
                        encontrado = ds.values.some(function (row) {
                            return (row["Nome_do_Arquivo"] || "") === nomeArquivo;
                        });
                    }
                }

                callback({
                    encontrado: encontrado,
                    erro: false
                });
            },
            error: function (err) {
                callback({
                    encontrado: false,
                    erro: true,
                    mensagem: err
                });
            }
        });
    };

    var verificarArquivoNaPastaEnviados = function (nomeArquivo, callback) {
        var c1 = DatasetFactory.createConstraint("nomeArquivo", nomeArquivo, nomeArquivo, ConstraintType.MUST);
        DatasetFactory.getDataset("DS_VERIFICAR_ARQUIVO_ENVIADOS", null, [c1], null, {
            success: function (ds) {
                var encontrado = !!(ds && ds.values && ds.values.length > 0 && ds.values[0].STATUS === "ENCONTRADO");
                callback({
                    encontrado: encontrado,
                    erro: false
                });
            },
            error: function (err) {
                callback({
                    encontrado: false,
                    erro: true,
                    mensagem: err
                });
            }
        });
    };

    var verificarEstadoFisicoArquivo = function (nomeArquivo, callback) {
        verificarArquivoNaPastaEnviar(nomeArquivo, function (resultadoEnviar) {
            if (resultadoEnviar.encontrado) {
                callback({
                    estadoFisico: "ENVIAR",
                    emEnviar: true,
                    emEnviados: false
                });
                return;
            }

            verificarArquivoNaPastaEnviados(nomeArquivo, function (resultadoEnviados) {
                callback({
                    estadoFisico: resultadoEnviados.encontrado ? "ENVIADOS" : "CONSUMIDO",
                    emEnviar: false,
                    emEnviados: resultadoEnviados.encontrado
                });
            });
        });
    };

    var aplicarEstadoFisicoArquivo = function (arquivoSalvo, statusSalvo, conteudoSalvo, estadoFisico) {
        $("#btn_enviar_fileserver")
            .prop("disabled", true)
            .removeClass("btn-success")
            .addClass("btn-default")
            .html('<i class="flaticon flaticon-check"></i> Enviado à VAN');
        $("#fileNameVan").val(arquivoSalvo);

        if (estadoFisico === "ENVIAR") {
            ocultarAvisosRevalidacao();
            $("#painel_monitoramento_van").removeClass("panel-success").addClass("panel-info").show();
            if (conteudoSalvo && typeof processarTextoVanAuditoria === "function") {
                processarTextoVanAuditoria(conteudoSalvo, arquivoSalvo, true);
            } else if (typeof conteudoSalvo !== "undefined") {
                lerConteudoArquivoFisico(arquivoSalvo, "Enviar", function (erro, conteudoFisico) {
                    if (!erro && conteudoFisico && typeof processarTextoVanAuditoria === "function") {
                        conteudoArquivoParaEnvio = conteudoFisico;
                        processarTextoVanAuditoria(conteudoFisico, arquivoSalvo, true);
                    }
                });
            }
            if (statusSalvo === "PENDENTE") {
                $("#texto_monitoramento_van").html("Aguardando o robô da VAN capturar o arquivo: <span style=\"background:#fff3cd; color:#856404; font-weight:bold; padding:2px 6px; border-radius:3px;\">" + arquivoSalvo + "</span>");
                $("#barra_progresso_van").show();
            }
            return "ENVIAR";
        }

        if (estadoFisico === "ENVIADOS") {
            mostrarAvisoEnvio("Esse arquivo já foi movido para a pasta Enviados");
            if (conteudoSalvo && typeof processarTextoVanAuditoria === "function") {
                processarTextoVanAuditoria(conteudoSalvo, arquivoSalvo, true);
            } else {
                lerConteudoArquivoFisico(arquivoSalvo, "Enviados", function (erro, conteudoFisico) {
                    if (!erro && conteudoFisico && typeof processarTextoVanAuditoria === "function") {
                        conteudoArquivoParaEnvio = conteudoFisico;
                        processarTextoVanAuditoria(conteudoFisico, arquivoSalvo, true);
                    }
                });
            }
            montarPainelSucesso(arquivoSalvo);
            return "ENVIADOS";
        }

        mostrarAvisoEnvio("Esse arquivo já foi movido para a pasta Enviados");
        mostrarAvisoMonitoramento("Esse arquivo já passou por essa pasta e agora está sendo processado pelo banco");
        if (conteudoSalvo && typeof processarTextoVanAuditoria === "function") {
            processarTextoVanAuditoria(conteudoSalvo, arquivoSalvo, true);
        }
        montarPainelConsumido(arquivoSalvo);
        pararMonitoramentoSilenciosoControle();
        return "CONSUMIDO";
    };

    var revalidarSilenciosamenteControle = function () {
        var atividadeAtual = ($("#wkNumState_hidden").val() || "").toString();
        if (atividadeAtual !== "40") {
            pararMonitoramentoSilenciosoControle();
            return;
        }

        var numProcesso = pegarNumeroProcesso();
        if (!numProcesso || !arquivoMonitoradoSilencioso) {
            pararMonitoramentoSilenciosoControle();
            return;
        }

        var c1 = DatasetFactory.createConstraint("acao", "LER", "LER", ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("numProcesso", numProcesso, numProcesso, ConstraintType.MUST);

        DatasetFactory.getDataset("DS_ESTADO_VAN", null, [c1, c2], null, {
            success: function (ds) {
                if (!(ds && ds.values && ds.values.length > 0)) {
                    pararMonitoramentoSilenciosoControle();
                    return;
                }

                var arquivoSalvo = ds.values[0].ARQUIVO;
                var statusSalvo = ds.values[0].STATUS;
                var estadoCache = decodificarEstadoMonitoramento(arquivoSalvo);
                var conteudoSalvo = "";

                if (estadoCache && typeof estadoCache === "object") {
                    arquivoSalvo = estadoCache.arquivo || "";
                    statusSalvo = estadoCache.status || statusSalvo;
                    conteudoSalvo = estadoCache.conteudo || "";
                }

                if (arquivoSalvo !== arquivoMonitoradoSilencioso || arquivoSalvo === "NAO_EXISTE" || arquivoSalvo === "ERRO" || arquivoSalvo === "VAZIO") {
                    pararMonitoramentoSilenciosoControle();
                    return;
                }

                verificarEstadoFisicoArquivo(arquivoSalvo, function (estadoFisico) {
                    var resultado = aplicarEstadoFisicoArquivo(arquivoSalvo, statusSalvo, conteudoSalvo, estadoFisico.estadoFisico);
                    if (resultado === "CONSUMIDO") {
                        pararMonitoramentoSilenciosoControle();
                    }
                });
            },
            error: function () {
                pararMonitoramentoSilenciosoControle();
            }
        });
    };

    var iniciarMonitoramentoSilenciosoControle = function (nomeArquivo) {
        if (!nomeArquivo) return;
        arquivoMonitoradoSilencioso = nomeArquivo;
        if (intervaloRevalidacaoSilenciosa) {
            return;
        }
        intervaloRevalidacaoSilenciosa = setInterval(function () {
            revalidarSilenciosamenteControle();
        }, periodoRevalidacaoSilenciosa);
    };

    var restaurarResumoRestante = function (arquivoSalvo, conteudoSalvo, pastaFisica, estadoFisico) {
        var restaurarConteudo = function (conteudo) {
            if (conteudo && typeof processarTextoVanAuditoria === "function") {
                processarTextoVanAuditoria(conteudo, arquivoSalvo, true);
            } else {
                $("#fileNameVan")
                    .val(arquivoSalvo)
                    .css({ backgroundColor: "#fff3cd", color: "#856404", fontWeight: "bold" });
            }

            $("#btn_enviar_fileserver")
                .prop("disabled", true)
                .removeClass("btn-success")
                .addClass("btn-default")
                .html('<i class="flaticon flaticon-check"></i> Enviado Ã  VAN');
        };

        if (conteudoSalvo) {
            restaurarConteudo(conteudoSalvo);
            return;
        }

        lerConteudoArquivoFisico(arquivoSalvo, pastaFisica, function (erro, conteudoFisico) {
            if (!erro && conteudoFisico) {
                conteudoArquivoParaEnvio = conteudoFisico;
                restaurarConteudo(conteudoFisico);
                return;
            }

            $("#fileNameVan")
                .val(arquivoSalvo)
                .css({ backgroundColor: "#fff3cd", color: "#856404", fontWeight: "bold" });

            $("#btn_enviar_fileserver")
                .prop("disabled", true)
                .removeClass("btn-success")
                .addClass("btn-default")
                .html('<i class="flaticon flaticon-check"></i> Enviado Ã  VAN');
        });
    };

    var pegarNumeroProcesso = function () {
        var num = $("#num_processo_van").val();
        if (num && num !== "0") return num;
        num = $("#WKNumProces").val();
        if (num && num !== "0") return num;
        if (window.WKNumProces && window.WKNumProces != "0" && window.WKNumProces != null) return window.WKNumProces;
        try {
            var urlParams = new URLSearchParams(window.parent.location.search);
            num = urlParams.get('processInstanceId');
            if (num && num !== "0") return num;
        } catch (e) { }
        return null;
    };

    var salvarEstadoServidor = function (nomeArquivo, status) {
        var numProcesso = pegarNumeroProcesso();
        if (!numProcesso) return;

        var estadoCache = montarEstadoCache(nomeArquivo, status);
        var estadoBase64 = codificarEstadoMonitoramento(estadoCache);

        var c1 = DatasetFactory.createConstraint("acao", "SALVAR", "SALVAR", ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("numProcesso", numProcesso, numProcesso, ConstraintType.MUST);
        var c3 = DatasetFactory.createConstraint("nomeArquivo", estadoBase64, estadoBase64, ConstraintType.MUST);
        var c4 = DatasetFactory.createConstraint("status", status, status, ConstraintType.MUST);

        DatasetFactory.getDataset("DS_ESTADO_VAN", null, [c1, c2, c3, c4], null, {});
    };

    var limparEstadoServidor = function () {
        var numProcesso = pegarNumeroProcesso();
        if (!numProcesso) return;

        var c1 = DatasetFactory.createConstraint("acao", "LIMPAR", "LIMPAR", ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("numProcesso", numProcesso, numProcesso, ConstraintType.MUST);

        DatasetFactory.getDataset("DS_ESTADO_VAN", null, [c1, c2], null, {});

        if (typeof intervalo !== "undefined" && intervalo) {
            clearInterval(intervalo);
            intervalo = null;
        }

        if (typeof conteudoArquivoParaEnvio !== "undefined") {
            conteudoArquivoParaEnvio = "";
        }

        pararMonitoramentoSilenciosoControle();
        ocultarAvisosRevalidacao();
        $("#fileNameVan").val("");
        $("#painel_monitoramento_van").hide().removeClass("panel-success").addClass("panel-info");
        $("#texto_monitoramento_van").html("Aguardando envio do arquivo...");
        $("#barra_progresso_van").hide();
    };

    var montarPainelSucesso = function (nomeArquivo) {
        $("#barra_progresso_van").hide();
        $("#painel_monitoramento_van").removeClass("panel-info").addClass("panel-success").show();

        var caminhoVisor = "\\\\sotersrv38\\FileServer\\RH\\03. Dpto Pessoal\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\02 - BRAD_Retorno_Automatico\\Enviados\\";
        var htmlVisual = '<div class="text-left" style="margin-top: 10px; padding: 0 20px;">';
        htmlVisual += '  <p class="text-muted" style="font-size: 13px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">';
        htmlVisual += '    <i class="flaticon flaticon-folder-open icon-sm" style="color: #f39c12;"></i> <b>Destino Atual:</b> ' + caminhoVisor;
        htmlVisual += '  </p>';
        htmlVisual += '  <ul class="list-group" style="max-width: 600px; margin: 0 auto;">';
        htmlVisual += '    <li class="list-group-item text-muted" style="opacity: 0.5; background: #fdfdfd; border-style: dashed;"><i class="flaticon flaticon-document icon-sm"></i> <i>...outros_arquivos_anteriores.txt</i></li>';
        htmlVisual += '    <li class="list-group-item" style="font-size: 16px; border-left: 5px solid #f0ad4e; padding: 15px; background-color:#fff3cd; color:#856404;"><i class="flaticon flaticon-check-circle icon-md" style="color:#f0ad4e;"></i> <span style="background:#fff8db; color:#856404; font-weight:bold; padding:2px 6px; border-radius:3px;">' + nomeArquivo + '</span><span class="badge pull-right" style="background-color: #f0ad4e; margin-top: 2px;">Na Pasta</span></li>';
        htmlVisual += '    <li class="list-group-item text-muted" style="opacity: 0.5; background: #fdfdfd; border-style: dashed;"><i class="flaticon flaticon-document icon-sm"></i> <i>...aguardando_novos_arquivos.txt</i></li>';
        htmlVisual += '  </ul>';
        htmlVisual += '  <div class="text-center" style="margin-top: 20px;"><span class="text-success" style="font-size: 16px;"><b><i class="flaticon flaticon-done-all"></i> Sucesso! O robÃ´ capturou e moveu o arquivo para a pasta Enviados.</b></span></div>';
        htmlVisual += '</div>';

        $("#texto_monitoramento_van").html(htmlVisual);
    };

    var montarPainelConsumido = function (nomeArquivo) {
        $("#barra_progresso_van").hide();
        $("#painel_monitoramento_van").removeClass("panel-info").addClass("panel-success").show();
        $("#btn_enviar_fileserver")
            .prop("disabled", true)
            .removeClass("btn-success")
            .addClass("btn-default")
            .html('<i class="flaticon flaticon-check"></i> Consumido pelo Banco');

        var htmlVisual = '<div class="text-left" style="margin-top: 10px; padding: 0 20px;">';
        htmlVisual += '  <div class="alert alert-success" style="margin-bottom: 15px;">';
        htmlVisual += '    <strong>Arquivo recolhido pelo banco.</strong> O processamento foi concluÃ­do e nÃ£o Ã© necessÃ¡rio reenviar.';
        htmlVisual += '  </div>';
        htmlVisual += '  <p class="text-muted" style="font-size: 13px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">';
        htmlVisual += '    <i class="flaticon flaticon-folder-open icon-sm" style="color: #f39c12;"></i> <b>Arquivo preservado no cache:</b> ' + nomeArquivo;
        htmlVisual += '  </p>';
        htmlVisual += '  <div class="alert alert-info" style="margin-bottom: 0;">';
        htmlVisual += '    O resumo visual foi restaurado a partir do cache Base64 e permanece disponÃ­vel nesta tela.';
        htmlVisual += '  </div>';
        htmlVisual += '</div>';

        $("#texto_monitoramento_van").html(htmlVisual);
        pararMonitoramentoSilenciosoControle();
    };

    var iniciar = function (nomeArquivo) {
        salvarEstadoServidor(nomeArquivo, "PENDENTE");
        iniciarMonitoramentoSilenciosoControle(nomeArquivo);
        if (typeof intervalo !== "undefined" && intervalo) {
            clearInterval(intervalo);
            intervalo = null;
        }
        $("#painel_monitoramento_van").show();
        $("#texto_monitoramento_van").html("Aguardando o robô da VAN capturar o arquivo: <span style=\"background:#fff3cd; color:#856404; font-weight:bold; padding:2px 6px; border-radius:3px;\">" + nomeArquivo + "</span>");
        $("#barra_progresso_van").show();
        setTimeout(function () { verificar(nomeArquivo); }, 3000);
        intervalo = setInterval(function () { verificar(nomeArquivo); }, 10000);
    };

    var verificar = function (nomeArquivo) {
        var c1 = DatasetFactory.createConstraint("nomeArquivo", nomeArquivo, nomeArquivo, ConstraintType.MUST);
        DatasetFactory.getDataset("DS_VERIFICAR_ARQUIVO_ENVIADOS", null, [c1], null, {
            success: function (ds) {
                if (ds && ds.values && ds.values.length > 0) {
                    if (ds.values[0].STATUS === "ENCONTRADO") {
                        clearInterval(intervalo);
                        salvarEstadoServidor(nomeArquivo, "CONCLUIDO");
                        montarPainelSucesso(nomeArquivo);
                    }
                }
            }
        });
    };

    // ============================================================
    // RECUPERA O ARQUIVO E RECONSTRÃ“I O PAINEL SUPERIOR (DEBUG)
    // ============================================================
    var reconstruirPainelSuperior = function (nomeArquivo, statusAtual) {
        var pastaAlvo = (statusAtual === "CONCLUIDO") ? "Enviados" : "Enviar";
        console.log("MonitoramentoVAN: Tentando restaurar resumo do arquivo '" + nomeArquivo + "' na pasta '" + pastaAlvo + "'.");

        if (typeof conteudoArquivoParaEnvio !== "undefined" && conteudoArquivoParaEnvio) {
            processarTextoVanAuditoria(conteudoArquivoParaEnvio, nomeArquivo, true);
            return;
        }

        lerConteudoArquivoFisico(nomeArquivo, pastaAlvo, function (erro, conteudo) {
            if (erro || !conteudo) {
                console.warn("MonitoramentoVAN: restauração sem conteúdo físico disponível para '" + nomeArquivo + "'.");
                return;
            }

            conteudoArquivoParaEnvio = conteudo;
            processarTextoVanAuditoria(conteudo, nomeArquivo, true);
        });
    };
    var restaurarEstadoSeExistir = function () {
        var atividadeAtual = ($("#wkNumState_hidden").val() || "").toString();
        if (atividadeAtual !== "40") {
            $("#painel_envio_van_40, #painel_retorno_van_40, #painel_status_geral_40, #painel_aprovacao_40, #painel_lista_enviar_40, #painel_monitoramento_van").hide();
            $("#painel_monitoramento_van").hide().removeClass("panel-success").addClass("panel-info");
            $("#texto_monitoramento_van").html("Aguardando envio do arquivo...");
            $("#barra_progresso_van").hide();
            $("#fileNameVan").val("");
            ocultarAvisosRevalidacao();
            return;
        }

        var numProcesso = pegarNumeroProcesso();
        if (!numProcesso) return;

        var c1 = DatasetFactory.createConstraint("acao", "LER", "LER", ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("numProcesso", numProcesso, numProcesso, ConstraintType.MUST);

        DatasetFactory.getDataset("DS_ESTADO_VAN", null, [c1, c2], null, {
            success: function (ds) {
                if (ds && ds.values && ds.values.length > 0) {
                    var arquivoSalvo = ds.values[0].ARQUIVO;
                    var statusSalvo = ds.values[0].STATUS;
                    var estadoCache = decodificarEstadoMonitoramento(arquivoSalvo);
                    var conteudoSalvo = "";
                    var resumoSalvo = null;

                    if (estadoCache && typeof estadoCache === "object") {
                        arquivoSalvo = estadoCache.arquivo || "";
                        statusSalvo = estadoCache.status || statusSalvo;
                        conteudoSalvo = estadoCache.conteudo || "";
                        resumoSalvo = estadoCache.resumo || null;
                    }

                    if (arquivoSalvo !== "NAO_EXISTE" && arquivoSalvo !== "ERRO" && arquivoSalvo !== "VAZIO") {
                        iniciarMonitoramentoSilenciosoControle(arquivoSalvo);
                        $("#btn_enviar_fileserver")
                            .prop("disabled", true)
                            .removeClass("btn-success")
                            .addClass("btn-default")
                            .html('<i class="flaticon flaticon-check"></i> Enviado à VAN');
                        $("#fileNameVan").val(arquivoSalvo);
                        conteudoArquivoParaEnvio = conteudoSalvo || conteudoArquivoParaEnvio || "";

                        verificarEstadoFisicoArquivo(arquivoSalvo, function (estadoFisico) {
                            var resultadoEstado = aplicarEstadoFisicoArquivo(arquivoSalvo, statusSalvo, conteudoSalvo, estadoFisico.estadoFisico);
                            if (resultadoEstado === "ENVIAR" && statusSalvo === "PENDENTE") {
                                iniciar(arquivoSalvo);
                            }
                        });
                    }
                }
            }
        });
    };

    return {
        iniciar: iniciar,
        restaurarEstadoSeExistir: restaurarEstadoSeExistir,
        limparEstadoServidor: limparEstadoServidor,
        pararMonitoramentoSilenciosoControle: pararMonitoramentoSilenciosoControle,
        iniciarMonitoramentoSilenciosoControle: iniciarMonitoramentoSilenciosoControle
    };
})();

// ============================================================
// MÃ“DULO: LEITURA DE RETORNOS DO FILESERVER (ATUALIZADO)
// ============================================================

var RetornoFileServer = (function () {

    var listarArquivos = function (callback) {
        var loading = FLUIGC.loading(window);
        loading.show();

        try {
            DatasetFactory.getDataset("DS_LISTAR_RETORNOS", null, [], null, {
                success: function (ds) {
                    loading.hide();
                    if (ds && ds.values && ds.values.length > 0) {
                        // Verifica se o dataset retornou a mensagem de erro que configuramos
                        if (ds.values[0]["Nome_do_Arquivo"] === "Aviso" || ds.values[0]["Nome_do_Arquivo"] === "Erro") {
                            callback(ds.values[0]["Tamanho"], []);
                        } else {
                            callback(null, ds.values);
                        }
                    } else {
                        callback("Nenhum arquivo de retorno encontrado.", []);
                    }
                },
                error: function (err) {
                    loading.hide();
                    callback("Erro ao listar arquivos: " + err, []);
                }
            });
        } catch (e) {
            loading.hide();
            callback("Erro de execuÃ§Ã£o: " + e, []);
        }
    };

    var lerArquivo = function (nomeArquivo, callback) {
        var loading = FLUIGC.loading(window);
        loading.show();

        var c1 = DatasetFactory.createConstraint("nomeArquivo", nomeArquivo, nomeArquivo, ConstraintType.MUST);

        try {
            DatasetFactory.getDataset("DS_LER_RETORNO", null, [c1], null, {
                success: function (ds) {
                    loading.hide();
                    if (ds && ds.values && ds.values.length > 0) {
                        // Se retornou a flag de erro na coluna status
                        if (ds.values[0]["status"] && ds.values[0]["status"].indexOf("ERRO") > -1) {
                            callback(ds.values[0]["status"], "");
                        } else {
                            // Junta as linhas do array num texto Ãºnico simulando o FileReader
                            var conteudo = ds.values.map(function (row) {
                                return row["conteudo"] || "";
                            }).join("\n");
                            callback(null, conteudo);
                        }
                    } else {
                        callback("Arquivo vazio ou erro na leitura.", "");
                    }
                },
                error: function (err) {
                    loading.hide();
                    callback("Erro ao acessar dataset de leitura: " + err, "");
                }
            });
        } catch (e) {
            loading.hide();
            callback("Erro ao ler arquivo: " + e, "");
        }
    };

    // Abre uma Modal do Fluig para o usuÃ¡rio selecionar o arquivo de retorno da rede
    var abrirModalRetornos = function () {
        listarArquivos(function (erro, arquivos) {
            if (erro) {
                FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: erro, type: 'warning' });
                return;
            }

            var html = '<div class="table-responsive"><table class="table table-striped table-hover">';
            html += '<thead><tr><th>Arquivo</th><th>Tamanho</th><th>Data</th><th>AÃ§Ã£o</th></tr></thead><tbody>';

            arquivos.forEach(function (arq) {
                html += '<tr>';
                // Usa os nomes exatos das colunas do DS_LISTAR_RETORNOS
                html += '<td><i class="flaticon flaticon-document icon-sm"></i> <b>' + arq["Nome_do_Arquivo"] + '</b></td>';
                html += '<td>' + arq["Tamanho"] + '</td>';
                html += '<td>' + arq["Data_Modificacao"] + '</td>';
                html += '<td><button class="btn btn-sm btn-success btn-processar-modal" data-arquivo="' + arq["Nome_do_Arquivo"] + '">Processar Retorno</button></td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';

            var modalRetorno = FLUIGC.modal({
                title: 'Arquivos de Retorno DisponÃ­veis (FileServer)',
                content: html,
                id: 'modal-retornos-fileserver',
                size: 'large',
                actions: [{
                    'label': 'Fechar',
                    'autoClose': true
                }]
            }, function (err, data) {
                if (err) return;

                // Dispara o clique no botÃ£o de processar dentro da modal
                $('#modal-retornos-fileserver').on('click', '.btn-processar-modal', function () {
                    var nomeArq = $(this).data('arquivo');
                    modalRetorno.remove(); // Fecha a modal
                    processarRetornoSelecionado(nomeArq);
                });
            });
        });
    };

    var processarRetornoSelecionado = function (nomeArquivo) {
        lerArquivo(nomeArquivo, function (erro, conteudo) {
            if (erro) {
                FLUIGC.toast({ title: 'Erro de Leitura', message: erro, type: 'danger' });
                return;
            }

            // INTEGRAÃ‡ÃƒO PERFEITA: Passa o conteÃºdo lido na rede para a funÃ§Ã£o que vocÃª jÃ¡ criou!
            // Ela vai extrair, preencher a Atividade 40 e setar o arquivo como Autorizado/Aceito.
            if (typeof processarTextoRetornoAuditoria === "function") {
                processarTextoRetornoAuditoria(conteudo, nomeArquivo);
            } else {
                FLUIGC.toast({ title: 'Erro', message: 'FunÃ§Ã£o de auditoria nÃ£o encontrada no formulÃ¡rio.', type: 'danger' });
            }
        });
    };

    return {
        abrirModalRetornos: abrirModalRetornos
    };

})();

// ============================================================
// VALIDADOR UNIVERSAL BRADESCO (MODAL COM SIDEBAR LATERAL)
// ============================================================
function abrirValidadorBradesco() {
    var nomeArquivo = $("#fileNameVan").val() || $("#fileNameRetorno").val();
    if (!nomeArquivo) nomeArquivo = "Nenhum arquivo processado.";

    var urlBradesco = "https://wspf.banco.bradesco/wsValidadorUniversal/validadorgeral";
    
    // Usa CSS Flexbox para dividir a tela: Esquerda (Aviso) / Direita (Site)
    var htmlContent = '<div style="display: flex; flex-direction: row; height: 600px; margin: -15px;">';
    
    // SIDEBAR LATERAL (Esquerda)
    htmlContent += '<div style="width: 280px; background-color: #fdf3f5; border-right: 4px solid #cc092f; padding: 25px 20px; display: flex; flex-direction: column;">';
    // htmlContent += '  <img src="https://banco.bradesco/assets/classic/geral/img/logo-bradesco-topo.png" style="max-width: 130px; margin-bottom: 25px;">'; // Descomente se quiser forÃ§ar o logo original do banco web
    htmlContent += '  <h4 style="margin: 0 0 15px 0; color: #cc092f; font-size: 16px; line-height: 1.4;">';
    htmlContent += '    <i class="flaticon flaticon-document icon-sm"></i> <b>Arquivo Atual</b>';
    htmlContent += '  </h4>';
    htmlContent += '  <div style="background: white; padding: 12px; border: 1px solid #ddd; border-radius: 4px; word-wrap: break-word; font-family: monospace; font-size: 13px; color: #333; margin-bottom: 20px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">';
    htmlContent +=       nomeArquivo;
    htmlContent += '  </div>';
    htmlContent += '  <p style="margin: 0; font-size: 13.5px; color: #555; line-height: 1.5;">';
    htmlContent += '    Para validar a estrutura, certifique-se de que transferiu este arquivo no botÃ£o <b>"Baixar Arquivo"</b> na tela anterior.<br><br>Em seguida, clique na Ã¡rea de upload ao lado e selecione-o.';
    htmlContent += '  </p>';
    htmlContent += '</div>';

    // SITE DO BANCO (Direita - Ocupa todo o resto do espaÃ§o 'flex: 1')
    htmlContent += '<div style="flex: 1; background: #fff;">';
    htmlContent += '  <iframe src="' + urlBradesco + '" style="width: 100%; height: 100%; border: none; overflow: hidden;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>';
    htmlContent += '</div>';

    htmlContent += '</div>'; // Fecha o Flexbox container

    var modalValidador = FLUIGC.modal({
        title: 'Validador Universal Bradesco - Folha de Pagamento',
        content: htmlContent,
        id: 'modal-validador-bradesco',
        size: 'full', 
        actions: [{ 'label': 'Fechar Validador', 'autoClose': true }]
    });
}

// ============================================================
// INICIALIZAÃ‡ÃƒO: Carrega lista ao abrir o formulÃ¡rio
// ============================================================
$(document).ready(function () {

    // BotÃ£o para buscar retornos do FileServer
    $("#btn_buscar_retornos").on("click", function () {
        var filtro = $("#txt_filtro_retorno").val();
        RetornoFileServer.listarArquivos(filtro, function (erro, arquivos) {
            if (erro) {
                Compartilhados.WarningToast(erro, "AtenÃ§Ã£o", "warning");
            }
            RetornoFileServer.renderizarTabela(arquivos, "tabela_retornos");
        });
    });
});

// =================================================================================
// LÃ“GICA DA ATIVIDADE 40 (ENVIO VAN)
// =================================================================================

// =================================================================================
// LÃ“GICA DA ATIVIDADE 40 (ENVIO E RETORNO VAN)
// =================================================================================

function iniciarPainelVan40() {
    var tipoDoc = $("#tipo_documento").val();

    if (tipoDoc !== "cnab") {
        $("#painel_envio_van_40 .panel-body").html("<div class='alert alert-info'>Atividade nÃ£o aplicÃ¡vel para Guias/Outros. Movimente a solicitaÃ§Ã£o.</div>");
        // Oculta os de retorno
        $("#painel_retorno_van_40, #painel_status_geral_40, #painel_aprovacao_40").hide();
        return;
    }

    $("#painel_retorno_van_40").show();
    $("#bloco_retorno_h23").show();
    $("#bloco_retorno_manual").hide();

    var empresaDesc = $("#txt_empresa").val() || "";
    var bancoDesc = $("#txt_banco").val() || "";

    var isColigada14 = empresaDesc.indexOf("14") > -1 || empresaDesc.toUpperCase().indexOf("H23") > -1;
    var isBradesco = bancoDesc.indexOf("237") > -1 || bancoDesc.toUpperCase().indexOf("BRADESCO") > -1;

    if (isColigada14 && isBradesco) {
        // Envio
        $("#bloco_van_automatica").show();
        $("#bloco_van_manual").hide();
    } else {
        // Envio
        $("#bloco_van_automatica").hide();
        $("#bloco_van_manual").show();
    }
}



// BotÃ£o: Buscar AutomÃ¡tico (Retorno)
function buscarRetornoAutomatico() {
    // Abre a modal que lista os arquivos direto da pasta do FileServer e permite leitura
    RetornoFileServer.abrirModalRetornos();
}

function visualizarArquivosPastaEnviar40() {
    var loading = FLUIGC.loading(window);
    loading.show();

    var c1 = DatasetFactory.createConstraint("pasta", "Enviar", "Enviar", ConstraintType.MUST);
    DatasetFactory.getDataset("DS_LISTAR_RETORNOS", null, [c1], null, {
        success: function (ds) {
            loading.hide();
            var arquivoAtual = $("#fileNameVan").val() || "";
            var html = '<div class="alert alert-warning" style="margin-bottom: 15px;">';
            html += '<strong>Atenção:</strong> esta visualização não altera a pasta <b>Enviar</b>. Para remover um arquivo de verdade, apague-o manualmente na pasta física.';
            html += '</div>';
            html += '<div class="table-responsive"><table class="table table-striped table-hover table-condensed">';
            html += '<thead><tr><th>Arquivo</th><th>Tamanho</th><th>Data</th></tr></thead><tbody>';

            if (!ds || !ds.values || ds.values.length === 0) {
                html += '<tr><td colspan="3" class="text-muted">Nenhum arquivo encontrado.</td></tr>';
            } else {
                ds.values.forEach(function (arq) {
                    var nome = arq["Nome_do_Arquivo"] || "";
                    var tamanho = arq["Tamanho"] || "-";
                    var data = arq["Data_Modificacao"] || "-";
                    var isAtual = arquivoAtual && nome === arquivoAtual;
                    html += '<tr' + (isAtual ? ' style="background-color:#fff3cd;"' : '') + '>';
                    html += '<td><i class="flaticon flaticon-document icon-sm"></i> <b>' + nome + '</b>';
                    if (isAtual) {
                        html += ' <span class="label label-warning" style="margin-left:8px;">Arquivo selecionado</span>';
                    }
                    html += '</td><td>' + tamanho + '</td><td>' + data + '</td></tr>';
                });
            }

            html += '</tbody></table></div>';

            FLUIGC.modal({
                title: 'Arquivos da Pasta Enviar',
                content: html,
                id: 'modal-arquivos-enviar-40',
                size: 'large',
                actions: [{
                    label: 'Fechar',
                    autoClose: true
                }]
            });
        },
        error: function () {
            loading.hide();
            FLUIGC.toast({ title: 'Erro', message: 'Falha ao listar pasta Enviar.', type: 'danger' });
        }
    });
}

function limparArquivoVanTela() {
    $("#fileNameVan").val("").css({ backgroundColor: "", color: "", fontWeight: "" });
    $("#resumo_van_extraido").hide();
    $("#painel_monitoramento_van").hide().removeClass("panel-success").addClass("panel-info");
    $("#texto_monitoramento_van").html("Aguardando envio do arquivo...");
    $("#barra_progresso_van").hide();
    $("#btn_enviar_fileserver").prop("disabled", true);
    $("#btn_limpar_arquivo_van").prop("disabled", true);
    $("#fileUploadVan").val("");
    if (typeof conteudoArquivoParaEnvio !== "undefined") {
        conteudoArquivoParaEnvio = "";
    }
    if (typeof MonitoramentoVAN !== "undefined" && typeof MonitoramentoVAN.pararMonitoramentoSilenciosoControle === "function") {
        MonitoramentoVAN.pararMonitoramentoSilenciosoControle();
    }
    if (typeof MonitoramentoVAN !== "undefined" && typeof MonitoramentoVAN.limparEstadoServidor === "function") {
        MonitoramentoVAN.limparEstadoServidor();
    }
    FLUIGC.toast({
        title: 'Arquivo removido da tela',
        message: 'Para excluir de fato, apague manualmente o arquivo na pasta Enviar.',
        type: 'warning'
    });
}

function lerRetornoManual(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var reader = new FileReader();

        reader.onload = function (e) {
            processarTextoRetornoAuditoria(e.target.result, file.name);
        };
        // O padrÃ£o "ISO-8859-1" garante a leitura correta dos ficheiros bancÃ¡rios
        reader.readAsText(file, "ISO-8859-1");
    }
}

// Processa o ficheiro de retorno e exibe na tela
function processarTextoRetornoAuditoria(texto, nomeArquivo) {
    try {
        if (typeof BradescoStrategy === 'undefined') throw new Error("EstratÃ©gia de leitura nÃ£o encontrada.");

        var dados = BradescoStrategy.processar(texto);

        $("#lbl_ret_empresa").text(dados.empresa);
        $("#lbl_ret_cnpj").text(dados.cnpj);
        $("#lbl_ret_dados_bancarios").text(dados.codigoBanco + " / " + dados.agencia + " / " + dados.conta);
        $("#lbl_ret_data").text(dados.dataCredito);
        $("#lbl_ret_valor").text("R$ " + dados.valor);
        $("#lbl_ret_arquivo").text(nomeArquivo);
        $("#fileNameRetorno").val(nomeArquivo);
        $("#resumo_retorno_extraido").slideDown();

        // ============================================================
        // 1. GERA O RELATÃ“RIO MULTIPAG FIXO NA TELA AUTOMATICAMENTE
        // ============================================================
        if (typeof window.MultipagBradesco !== 'undefined') {
            window.MultipagBradesco.renderizarNaTela(texto); 
        } else {
            console.error("MÃ³dulo MultipagBradesco nÃ£o encontrado no window.");
        }

        // ============================================================
        // 2. CONFIGURA O BOTÃƒO DE DOWNLOAD (Mantido visÃ­vel)
        // ============================================================
        $("#btn_download_retorno").show().off("click").on("click", function() {
            var blob = new Blob([texto], { type: "text/plain;charset=ISO-8859-1" });
            var link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = nomeArquivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            FLUIGC.toast({ title: 'Download ConcluÃ­do', message: 'Ficheiro transferido.', type: 'info' });
        });

        FLUIGC.toast({
            title: 'Leitura ConcluÃ­da',
            message: 'Verifique os dados extraÃ­dos do retorno antes de autorizar.',
            type: 'success'
        });

        $("input[name='flag_status_retorno'][value='aceito']").prop("checked", true);
        $("input[name='flag_status_geral'][value='autorizado']").prop("checked", true);
        if (typeof sincronizarStatusGeralComRetornoBanco === "function") {
            sincronizarStatusGeralComRetornoBanco();
        }
        if (typeof sincronizarPainelAprovacao40 === "function") {
            sincronizarPainelAprovacao40();
        }

    } catch (err) {
        FLUIGC.toast({ title: 'Erro na Leitura do Retorno', message: err.message, type: 'danger' });
        $("#resumo_retorno_extraido").hide();
        $("#painel_multipag_inline").hide().empty(); // Limpa o relatÃ³rio em caso de erro
        $("#fileNameRetorno").val("");
        $("input[name='flag_status_retorno']").prop("checked", false);
        $("input[name='flag_status_geral']").prop("checked", false);
        if (typeof sincronizarStatusGeralComRetornoBanco === "function") {
            sincronizarStatusGeralComRetornoBanco();
        }
        if (typeof sincronizarPainelAprovacao40 === "function") {
            sincronizarPainelAprovacao40();
        }
    }
}

// =================================================================================
// FUNÃ‡Ã•ES DE LEITURA E AUDITORIA DA VAN (ATIVIDADE 40)
// =================================================================================

// FunÃ§Ã£o 1: Acionada ao selecionar o arquivo do computador (Localizar)
function lerArquivoVanAuditoria(inputElement) {
    if (inputElement.files && inputElement.files[0]) {
        var file = inputElement.files[0];
        var reader = new FileReader();

        reader.onload = function (e) {
            processarTextoVanAuditoria(e.target.result, file.name);
        };
        reader.readAsText(file, "ISO-8859-1");
    }
}

// FunÃ§Ã£o 2: Acionada ao clicar no botÃ£o "Puxar Anexo" (Baseado no fluig-form-attachment)
function puxarAnexoProcessoVan() {
    // Acessa a API nativa do Fluig que gerencia a aba "Anexos" do processo
    if (!parent.ECM || !parent.ECM.attachmentTable) {
        FLUIGC.toast({ title: 'Erro', message: 'Tabela de anexos nÃ£o encontrada.', type: 'danger' });
        return;
    }

    // Pega todos os anexos fÃ­sicos que estÃ£o na aba do Fluig
    var anexos = parent.ECM.attachmentTable.getData();
    var anexoAlvo = null;

    // Itera de trÃ¡s pra frente para pegar sempre o anexo mais recente
    for (var i = anexos.length - 1; i >= 0; i--) {
        var physicalName = (anexos[i].physicalFileName || "").toLowerCase();
        var descName = (anexos[i].description || "").toLowerCase();

        // Procura por qualquer arquivo que seja .txt (ex: Itau-20250825141848-31-992725.txt)
        if (physicalName.indexOf(".txt") > -1 || descName.indexOf(".txt") > -1) {
            anexoAlvo = anexos[i];
            break;
        }
    }

    if (anexoAlvo) {
        var docId = anexoAlvo.documentId;
        var version = anexoAlvo.version;
        var companyId = parent.WCMAPI.organizationId || 1;
        var nomeArquivo = anexoAlvo.description || anexoAlvo.physicalFileName;

        // Se o arquivo foi anexado agora e a solicitaÃ§Ã£o ainda nÃ£o foi salva (nÃ£o tem ID)
        if (!docId) {
            FLUIGC.toast({ title: 'Aviso', message: 'O arquivo estÃ¡ na aba de anexos, mas nÃ£o possui ID. Salve a solicitaÃ§Ã£o primeiro.', type: 'warning' });
            return;
        }

        var loading = FLUIGC.loading(window);
        loading.show();

        // URL nativa de Stream (download fÃ­sico) do Fluig
        var urlDownload = "/webdesk/streamcontrol/?WDCompanyId=" + companyId + "&WDNrDocto=" + docId + "&WDNrVersao=" + version;

        // Faz um AJAX direto para baixar o texto do txt
        $.ajax({
            url: urlDownload,
            type: 'GET',
            beforeSend: function (jqXHR) {
                // ForÃ§a a leitura na codificaÃ§Ã£o correta de acentuaÃ§Ã£o para CNAB
                jqXHR.overrideMimeType('text/plain; charset=iso-8859-1');
            },
            success: function (conteudoTexto) {
                loading.hide();
                // Envia o texto lido para a auditoria
                processarTextoVanAuditoria(conteudoTexto, nomeArquivo);
            },
            error: function (err) {
                loading.hide();
                console.error("Erro ao ler Stream do anexo:", err);
                FLUIGC.toast({ title: 'Erro', message: 'Falha ao baixar o conteÃºdo do arquivo no servidor.', type: 'danger' });
            }
        });

    } else {
        FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Nenhum arquivo .txt foi encontrado na aba de Anexos do Fluig.', type: 'warning' });
    }
}

var conteudoArquivoParaEnvio = "";

// FunÃ§Ã£o 3: Centraliza a inteligÃªncia de validaÃ§Ã£o
function processarTextoVanAuditoria(texto, nomeArquivo, modoRestauracao) {
    try {
        // ============================================================
        // 1. VALIDAÇÃO DE REGRA DE NEGÓCIO: NOME DO ARQUIVO
        // ============================================================
        // Pega os 3 primeiros caracteres e joga para maiúsculo para garantir a validação
        if (nomeArquivo.substring(0, 3).toUpperCase() !== "H23") {
            throw new Error("O nome do arquivo deve começar obrigatoriamente com 'H23'. Por favor, renomeie o arquivo e tente novamente.");
        }

        if (typeof BradescoStrategy === 'undefined') {
            throw new Error("Estratégia de leitura (cnab_bradesco.js) não encontrada.");
        }

        conteudoArquivoParaEnvio = texto;

        // Processa o conteúdo text usando o seu Strategy
        var dados = BradescoStrategy.processar(texto);

        // Preenche a tabela visual
        $("#lbl_van_empresa").text(dados.empresa);
        $("#lbl_van_cnpj").text(dados.cnpj);
        $("#lbl_van_dados_bancarios").text(dados.codigoBanco + " / " + dados.agencia + " / " + dados.conta);
        $("#lbl_van_convenio").text(dados.convenio);
        $("#lbl_van_data").text(dados.dataCredito);
        $("#lbl_van_valor").text("R$ " + dados.valor);

        // A MÁGICA: Atualiza o campo com o nome do arquivo para liberar a validação do processo
        $("#fileNameVan")
            .val(nomeArquivo)
            .css({ backgroundColor: "#fff3cd", color: "#856404", fontWeight: "bold" });

        if (!modoRestauracao) {
            $("#btn_enviar_fileserver").prop("disabled", false);
            $("#btn_limpar_arquivo_van").prop("disabled", false);

            FLUIGC.toast({
                title: 'Sucesso',
                message: 'Arquivo (' + nomeArquivo + ') puxado e processado com sucesso!',
                type: 'success'
            });
        }

        // Exibe o resumo
        $("#resumo_van_extraido").slideDown();

    } catch (err) {
        // O aviso de erro vai estourar aqui na tela do usuário (em vermelho)
        FLUIGC.toast({ title: 'Atenção', message: err.message, type: 'danger', timeout: 'slow' });
        
        // Esconde o painel e limpa o nome do arquivo para bloquear o botão de envio
        $("#resumo_van_extraido").hide();
        $("#fileNameVan").val("").css({ backgroundColor: "", color: "", fontWeight: "" });
        $("#btn_enviar_fileserver").prop("disabled", true);
        $("#btn_limpar_arquivo_van").prop("disabled", true);
        conteudoArquivoParaEnvio = "";
    }
}
$(document).ready(function () {
    // Substitua o evento antigo do botÃ£o por este:
    $("#btn_enviar_fileserver").off("click").on("click", function () {
        var nomeArquivo = $("#fileNameVan").val();

        if (!nomeArquivo || !conteudoArquivoParaEnvio) {
            FLUIGC.toast({ title: 'AtenÃ§Ã£o', message: 'Nenhum arquivo processado. FaÃ§a a leitura ou puxe o anexo primeiro.', type: 'warning' });
            return;
        }

        // Converte o conteÃºdo para Base64 (btoa nativo do navegador)
        var b64Content = window.btoa(conteudoArquivoParaEnvio);

        // Feedback visual de carregamento
        var loading = FLUIGC.loading(window);
        loading.show();

        // Prepara as constraints para o Dataset
        var c1 = DatasetFactory.createConstraint("nomeArquivo", nomeArquivo, nomeArquivo, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("conteudoB64", b64Content, b64Content, ConstraintType.MUST);

        // Chama o Dataset que criamos no Passo 2
        DatasetFactory.getDataset("DS_ENVIAR_REMESSA_VAN", null, [c1, c2], null, {
            success: function (data) {
                loading.hide();
                if (data && data.values && data.values.length > 0) {
                    var status = data.values[0].STATUS;
                    var msg = data.values[0].MENSAGEM;

                    if (status === "OK") {
                        FLUIGC.toast({ title: 'Sucesso', message: msg, type: 'success' });

                        // Marca a flag de Processamento automaticamente
                        $("input[name='flag_status_geral'][value='processamento']").prop("checked", true);

                        // Altera o botÃ£o para evitar reenvio
                        $("#btn_enviar_fileserver")
                            .prop("disabled", true)
                            .removeClass("btn-success")
                            .addClass("btn-default")
                            .html('<i class="flaticon flaticon-check"></i> Enviado Ã  VAN');

                        MonitoramentoVAN.iniciar(nomeArquivo);

                    } else {
                        FLUIGC.toast({ title: 'Erro de PermissÃ£o/Servidor', message: msg, type: 'danger' });
                    }
                }
            },
            error: function (err) {
                loading.hide();
                FLUIGC.toast({ title: 'Erro de ConexÃ£o', message: 'Falha ao comunicar com o servidor do Fluig.', type: 'danger' });
            }
        });
    });
});

// ============================================================
// INICIALIZAÃ‡ÃƒO AUTOMÃTICA AO CARREGAR A PÃGINA (F5)
// ============================================================
function sincronizarStatusGeralComRetornoBanco() {
    var statusRetorno = $("input[name='flag_status_retorno']:checked").val();
    var $radioGeralRejeitado = $("input[name='flag_status_geral'][value='rejeitado']");
    var $radioGeralAutorizado = $("input[name='flag_status_geral'][value='autorizado']");

    if (!$radioGeralRejeitado.length) {
        return;
    }

    if (statusRetorno === "rejeitado") {
        if ($radioGeralAutorizado.is(":checked")) {
            $radioGeralAutorizado.prop("checked", false);
        }
        $radioGeralAutorizado.prop("disabled", true);
        $radioGeralRejeitado.prop("disabled", false).prop("checked", true);
        return;
    }

    if (statusRetorno === "aceito") {
        if ($radioGeralRejeitado.is(":checked")) {
            $radioGeralRejeitado.prop("checked", false);
        }
        $radioGeralRejeitado.prop("disabled", true);
        $radioGeralAutorizado.prop("disabled", false);
        return;
    }

    $radioGeralRejeitado.prop("disabled", false);
    $radioGeralAutorizado.prop("disabled", false);
}

function sincronizarPainelAprovacao40() {
    var atividadeAtual = ($("#wkNumState_hidden").val() || "").toString();
    if (atividadeAtual !== "40") {
        return;
    }

    var statusRetorno = $("input[name='flag_status_retorno']:checked").val();
    var $aprovacaoCampo = $("#txt_aprovacao_40");
    var $statusRetornoVan = $("#status_retorno_van");
    var $origemAprovacao40 = $("#origem_aprovacao_40");
    var $parecerBloco = $("#bloco_parecer_aprovacao_40");
    var $parecerCampo = $("#txt_parecer_aprovacao_40");

    if (!$aprovacaoCampo.length) {
        return;
    }

    $aprovacaoCampo.val("");
    if ($statusRetornoVan.length) {
        $statusRetornoVan.val("pendente");
    }
    if ($origemAprovacao40.length) {
        $origemAprovacao40.val("");
    }
    $parecerBloco.hide();
    $parecerCampo.prop("required", false);

    if (statusRetorno === "aceito") {
        $aprovacaoCampo.val("aprovado");
        if ($statusRetornoVan.length) {
            $statusRetornoVan.val("aprovado");
        }
        if ($origemAprovacao40.length) {
            $origemAprovacao40.val("40");
        }
        return;
    }

    if (statusRetorno === "rejeitado") {
        $aprovacaoCampo.val("rejeitado");
        if ($statusRetornoVan.length) {
            $statusRetornoVan.val("rejeitado");
        }
        if ($origemAprovacao40.length) {
            $origemAprovacao40.val("40");
        }
        $parecerBloco.show();
        $parecerCampo.prop("required", true);
    }
}

$(document).ready(function () {
    var atividadeAtual = ($("#wkNumState_hidden").val() || "").toString();
    if (atividadeAtual === "40") {
        $("input[name='flag_status_retorno']").off("change.syncStatusGeral40").on("change.syncStatusGeral40", function () {
            sincronizarStatusGeralComRetornoBanco();
            sincronizarPainelAprovacao40();
        });

        sincronizarStatusGeralComRetornoBanco();
        sincronizarPainelAprovacao40();
    }

    $("#btn_visualizar_pasta_enviar_40").off("click").on("click", function () {
        visualizarArquivosPastaEnviar40();
    });
});

$(window).on('load', function () {
    console.log("Gatilho de Janela carregado. A aguardar o Fluig...");

    // Aguarda 1.5s para garantir que os inputs ocultos como WKNumProces jÃ¡ existem no HTML
    setTimeout(function () {
        if (typeof MonitoramentoVAN !== 'undefined') {
            console.log("A iniciar tentativa de restauraÃ§Ã£o da VAN...");
            MonitoramentoVAN.restaurarEstadoSeExistir();
        } else {
            console.warn("MÃ³dulo MonitoramentoVAN nÃ£o foi carregado corretamente.");
        }
    }, 1500);
});

$(window).on('beforeunload unload', function () {
    if (typeof MonitoramentoVAN !== 'undefined' && typeof MonitoramentoVAN.pararMonitoramentoSilenciosoControle === 'function') {
        MonitoramentoVAN.pararMonitoramentoSilenciosoControle();
    }
});


