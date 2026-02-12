function displayFields(form, customHTML) {
    var atividade = getValue("WKNumState");
    var usuario = getValue("WKUser");
    var numeroSolicitacao = getValue("WKNumProces");
    var mode = form.getFormMode();

    // Persistência do Número da Solicitação e Dados Iniciais
    if (numeroSolicitacao != null && numeroSolicitacao != 0) {
        form.setValue("cpNumeroSolicitacao", numeroSolicitacao);
    }

    if ((atividade == 0 || atividade == 4) && mode != "VIEW") {
        form.setValue("cpNumeroSolicitacao", numeroSolicitacao);
        var hoje = new Date();
        var dia = hoje.getDate().toString(); if (dia.length == 1) dia = "0" + dia;
        var mes = (hoje.getMonth() + 1).toString(); if (mes.length == 1) mes = "0" + mes;
        var ano = hoje.getFullYear();
        form.setValue("cpDataAbertura", dia + '/' + mes + '/' + ano);
        
        var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", usuario, usuario, ConstraintType.MUST);
        var datasetColleague = DatasetFactory.getDataset("colleague", null, [c1], null);
        if (datasetColleague.rowsCount > 0) {
            form.setValue("cpNomeSolicitante", datasetColleague.getValue(0, "colleagueName"));
            form.setValue("cpEmailSolicitante", datasetColleague.getValue(0, "mail"));
        }
        form.setValue("cpTemDivergencia", "nao");
    }

    customHTML.append("<script>\n");
    customHTML.append("$(document).ready(function() {\n");

    // Ajuste Inicial de Interface
    customHTML.append(" if(typeof ajustarInterfacePorTipo === 'function') { ajustarInterfacePorTipo($('#tipo_documento').val()); }\n");

    // --- ATIVIDADE 12: ENVIO (Somente Email) ---
    if (atividade == 12) {
        customHTML.append(" $('#painel_email_rh').show();\n");
        customHTML.append(" $('#painel_info, #painel_leitura, #painel_erp, #painel_rateio, #painel_resumo').hide();\n");
        customHTML.append(" $('#painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia').hide();\n");
        customHTML.append(" $('#row_guia_header, #campos_originais_cnab, #row_cnab_inputs').hide();\n");
        customHTML.append(" setTimeout(function(){ if(typeof gerarTextoEmail === 'function'){ gerarTextoEmail(); } }, 1000);\n");
    }

    // --- ATIVIDADE 14 (VALIDAR) OU MODO VIEW (AUDITORIA) ---
    var isAudit = (atividade == 14 || (mode == "VIEW" && atividade != 12));

    if (isAudit) {
        var tipoDoc = form.getValue("tipo_documento");

        if (atividade == 14) {
             customHTML.append(" $('#check_ok').prop('disabled', true);\n");
        }

        customHTML.append(" setTimeout(function() {\n");

        if (tipoDoc == "guia_outros") {
            customHTML.append(" $('#campos_originais_cnab, #row_cnab_inputs, #painel_leitura, #painel_erp, #painel_rateio, #container_resumo_cnab').hide();\n");
            customHTML.append(" $('#row_guia_header, #painel_multi_lancamentos, #painel_consolidado_guia, #painel_resumo, #container_resumo_guia').show();\n");
            
            // --- RESTAURAÇÃO: Reconstrução da Tabela Resumo da Guia (Funcionalidade que havia sido perdida) ---
            customHTML.append(" var totalAcumulado = 0.00;\n");
            customHTML.append(" var tbody = $('#tbody_resumo_guia'); tbody.empty();\n");
            
            customHTML.append(" $('input[name^=\"card_id_lan___\"]').each(function() {\n");
            customHTML.append("     var index = this.name.split('___')[1];\n");
            customHTML.append("     var idLan = $(this).val();\n");
            customHTML.append("     var valorStr = $('input[name=\"card_valor___' + index + '\"]').val();\n");
            
            customHTML.append("     var codColigada = $('input[name=\"card_cod_coligada___' + index + '\"]').val() || '';\n");
            customHTML.append("     var codFilial = $('input[name=\"card_cod_filial___' + index + '\"]').val() || '';\n");
            customHTML.append("     var empFilial = $('input[name=\"card_empresa___' + index + '\"]').val() || '';\n");
            customHTML.append("     var nomeFilial = (empFilial.indexOf(' - ') > -1) ? empFilial.split(' - ')[1] : empFilial;\n");
            customHTML.append("     var textoColigadaFilial = codColigada + ' - ' + codFilial + ' - ' + nomeFilial;\n");

            // Reconstrói linha da tabela consolidada
            customHTML.append("     if(idLan && valorStr) {\n");
            customHTML.append("         var tr = '<tr><td>' + idLan + '</td><td>' + textoColigadaFilial + '</td><td class=\"text-right\">' + valorStr + '</td></tr>';\n");
            customHTML.append("         tbody.append(tr);\n");
            customHTML.append("         var valorFloat = parseFloat(valorStr.replace(/\\./g, '').replace(',', '.'));\n");
            customHTML.append("         if (!isNaN(valorFloat)) totalAcumulado += valorFloat;\n");
            customHTML.append("     }\n");
            
            // Reconstroi Rateios Individuais dos Cards (Visualização interna do Card)
            customHTML.append("     var jsonRateio = $('input[name=\"card_json_rateio___' + index + '\"]').val();\n");
            customHTML.append("     if(jsonRateio) { try { var lista = JSON.parse(jsonRateio); var row = $(this).closest('.panel-body'); var tb = row.find('.tbody-rateio-card'); tb.empty(); var tV=0; var tP=0; for(var i=0;i<lista.length;i++){ var it=lista[i]; var v=parseFloat(it.VALOR)||0; var p=parseFloat(it.PERCENTUAL)||0; tV+=v; tP+=p; tb.append('<tr><td>'+it.CODCCUSTO+' - '+it.NOMECCUSTO+'</td><td class=\"text-center\">'+p.toFixed(2)+'%</td><td class=\"text-right\">'+v.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</td></tr>'); } row.find('.total-perc-card').text(tP.toFixed(2)+'%'); row.find('.total-valor-card').text(tV.toLocaleString('pt-BR',{minimumFractionDigits:2})); } catch(e){} }\n");
            customHTML.append(" });\n");

            // Atualiza o Label do Total Consolidado
            customHTML.append(" var totalFormatado = totalAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });\n");
            customHTML.append(" $('#lbl_total_consolidado').text(totalFormatado);\n");
            // -------------------------------------------------------------------------------------------------

        } else {
            customHTML.append(" $('#campos_originais_cnab, #row_cnab_inputs, #painel_leitura, #painel_erp, #painel_rateio, #painel_resumo, #container_resumo_cnab').show();\n");
            customHTML.append(" $('#row_guia_header, #painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia').hide();\n");
        }

        // --- BLOQUEIO DOS CAMPOS ---
        customHTML.append(" var paineis = '#painel_info, #painel_erp, #painel_resumo, #painel_rateio, #painel_multi_lancamentos, #painel_consolidado_guia';\n");
        if (mode == "VIEW") {
            customHTML.append(" $('#painel_email_rh').show();\n");
            customHTML.append(" $('#painel_email_rh input, #painel_email_rh textarea').prop('readonly', true);\n");
            customHTML.append(" if(typeof gerarTextoEmail === 'function'){ gerarTextoEmail(); }\n");
        }
        customHTML.append(" $(paineis).find('input, select, textarea').prop('readonly', true);\n");
        customHTML.append(" $('#txt_justificativa').prop('readonly', true);\n");
        customHTML.append(" $(paineis).find('select, input[type=checkbox], input[type=radio]').css('pointer-events', 'none').css('background-color', '#eee');\n");
        customHTML.append(" $('.btn, .fluigicon-trash, button').not('#btn_imprimir').hide();\n");
        customHTML.append(" $('#fileUpload').hide();\n");

        customHTML.append(" }, 1000);\n");
    }

    customHTML.append("});\n");
    customHTML.append("</script>\n");
}