// simulation.js

$(document).ready(function() {
    console.log(">>> Módulo de Simulação Carregado <<<");

    $("#check_ok").prop("disabled", false);

    $("#erp_id_lan").on("blur", function() {
        var idDigitado = $(this).val();
        if (!idDigitado) return;

        limparCamposERP();

        if (idDigitado === "1") {
            carregarCenarioSucesso();
        } else if (idDigitado === "2") {
            carregarCenarioErroTotal();
        } else if (idDigitado === "3") {
            carregarCenarioParcial();
        } else {
            console.log("ID desconhecido.");
            return; 
        }

        setTimeout(function() {
            executarValidacaoCruzada();
        }, 200);
    });
});

function executarValidacaoCruzada() {
    console.log("Validando...");
    
    var mapa = [
        { campo: "Empresa",      arq: "#arq_empresa",   erp: "#erp_empresa",   chk: "chk_empresa",   msg: "#msg_empresa" },
        { campo: "CNPJ",         arq: "#arq_cnpj",      erp: "#erp_cnpj",      chk: "chk_cnpj",      msg: "#msg_cnpj" },
        { campo: "Banco",        arq: "#arq_banco",     erp: "#erp_banco",     chk: "chk_banco",     msg: "#msg_banco" },
        { campo: "Agência",      arq: "#arq_agencia",   erp: "#erp_agencia",   chk: "chk_agencia",   msg: "#msg_agencia" },
        { campo: "Conta",        arq: "#arq_conta",     erp: "#erp_conta",     chk: "chk_conta",     msg: "#msg_conta" },
        { campo: "Convênio",     arq: "#arq_convenio",  erp: "#erp_convenio",  chk: "chk_convenio",  msg: "#msg_convenio" },
        { campo: "Data Crédito", arq: "#arq_data_cred", erp: "#erp_data_cred", chk: "chk_data_cred", msg: "#msg_data_cred" },
        { campo: "Valor",        arq: "#arq_valor",     erp: "#erp_valor",     chk: "chk_valor",     msg: "#msg_valor" }
    ];

    var validacaoGeral = true;

    mapa.forEach(function(item) {
        var vArq = $(item.arq).val() ? String($(item.arq).val()).trim() : "";
        var vErp = $(item.erp).val() ? String($(item.erp).val()).trim() : "";

        // Normalização (remove pontos, traços, barras e espaços)
        var cleanArq = vArq.replace(/[\.\-\/\s]/g, "");
        var cleanErp = vErp.replace(/[\.\-\/\s]/g, "");

        // Remove zeros à esquerda
        cleanArq = cleanArq.replace(/^0+/, "");
        cleanErp = cleanErp.replace(/^0+/, "");

        var confere = (cleanArq === cleanErp);
        
        if(vArq === "" && vErp === "") confere = true;
        if((vArq !== "" && vErp === "") || (vArq === "" && vErp !== "")) confere = false;

        var inputStatus = $('input[name="' + item.chk + '"]');
        var spanMsg = $(item.msg);

        if (confere) {
            inputStatus.val("OK");
            inputStatus.css({ "background-color": "#dff0d8", "color": "#3c763d", "font-weight": "bold" });
            spanMsg.text(""); 
        } else {
            validacaoGeral = false;
            inputStatus.val("DIVERGENTE");
            inputStatus.css({ "background-color": "#f2dede", "color": "#a94442", "font-weight": "bold" });
            
            if(vErp === "") {
                spanMsg.text("ERP vazio");
            } else {
                spanMsg.html('<span class="text-danger">ERP: ' + vErp + '</span>');
            }
        }
    });

    if (validacaoGeral) {
        if(window.FLUIGC) FLUIGC.toast({ title: 'Sucesso', message: 'Tudo confere!', type: 'success' });
    } else {
        if(window.FLUIGC) FLUIGC.toast({ title: 'Atenção', message: 'Divergências encontradas.', type: 'warning' });
        $("#check_ok").prop("checked", false);
    }
    $("#check_ok").prop("disabled", false);
}

function limparCamposERP() {
    $("#erp_empresa, #erp_cnpj, #erp_banco, #erp_agencia, #erp_conta, #erp_convenio, #erp_data_cred, #erp_valor").val("");
    $("input[name^='chk_']").val("").css("background-color", "");
    $("span[id^='msg_']").empty();
    $("#check_ok").prop("checked", false).prop("disabled", false);
}

function carregarCenarioSucesso() {
    $("#erp_empresa").val("SOTER SOCIEDADE TECNICA DE ENG");
    // Ajustado para 15 digitos para bater com o arquivo (final 0)
    $("#erp_cnpj").val("23.009.852/9000-150"); 
    $("#erp_banco").val("BANCO BRADESCO");
    $("#erp_agencia").val("03375-8");
    $("#erp_conta").val("1268-8"); 
    $("#erp_convenio").val("582403"); // Sem zero a esquerda, a validação 'clean' garante o match
    $("#erp_data_cred").val("02/12/2025");
    $("#erp_valor").val("2.639,00");
}

function carregarCenarioErroTotal() {
    $("#erp_empresa").val("EMPRESA ERRADA S.A.");
    $("#erp_cnpj").val("00.000.000/0000-00");
    $("#erp_banco").val("ITAU");
    $("#erp_agencia").val("0000-0");
    $("#erp_conta").val("0000-0"); 
    $("#erp_convenio").val("000000");
    $("#erp_data_cred").val("01/01/2000");
    $("#erp_valor").val("1,00");
}

function carregarCenarioParcial() {
    $("#erp_empresa").val("SOTER SOCIEDADE TECNICA DE ENG");
    $("#erp_cnpj").val("23.009.852/9000-150");
    $("#erp_banco").val("BANCO BRADESCO");
    $("#erp_agencia").val("03375-8");
    $("#erp_convenio").val("582403");
    $("#erp_data_cred").val("02/12/2025");
    
    // Erros
    $("#erp_conta").val("9999-9"); 
    $("#erp_valor").val("5.000,00");
}

