function displayFields(form, customHTML) {
    var atividade = getValue("WKNumState");
    var usuario = getValue("WKUser");
    var numeroSolicitacao = getValue("WKNumProces");
    var mode = form.getFormMode();

    customHTML.append("<script>function getWKNumState(){ return " + atividade + "; }</script>");

    form.setShowDisabledFields(true);
    form.setHidePrintLink(true);

    form.setValue("wkNumState_hidden", atividade);

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

        customHTML.append("<script> $(document).ready(function(){ $('#painel_resumo_geral').show(); }); </script>");
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
    // Unificamos para garantir que a auditoria veja exatamente o que a Task 14 vê
    var isAudit = (atividade == 14 || (mode == "VIEW" && atividade != 12));

    if (isAudit) {
        var tipoDoc = form.getValue("tipo_documento");

        if (atividade == 14) {
            customHTML.append(" $('#check_ok').prop('disabled', true);\n");
        }

        customHTML.append(" setTimeout(function() {\n");

        // === LÓGICA PARA GUIA / OUTROS ===
        if (tipoDoc == "guia_outros") {
            customHTML.append(" $('#campos_originais_cnab, #row_cnab_inputs, #painel_leitura, #painel_erp, #painel_rateio, #container_resumo_cnab').hide();\n");
            customHTML.append(" $('#row_guia_header, #painel_multi_lancamentos, #painel_consolidado_guia, #painel_resumo, #container_resumo_guia').show();\n");

            // Reconstrução da Tabela Resumo (Recalcula visualmente)
            customHTML.append(" var totalAcumulado = 0.00;\n");
            customHTML.append(" var tbody = $('#tbody_resumo_guia'); tbody.empty();\n");
            customHTML.append(" var cabecalhoDataRaw = $('#guia_data_venc').val();\n");
            customHTML.append(" var cabecalhoDataPT = '';\n");
            customHTML.append(" if(cabecalhoDataRaw && cabecalhoDataRaw.indexOf('-') > -1) { var p = cabecalhoDataRaw.split('-'); cabecalhoDataPT = p[2] + '/' + p[1] + '/' + p[0]; } else { cabecalhoDataPT = cabecalhoDataRaw; }\n");
            customHTML.append(" var datasDiferentes = false;\n");

            customHTML.append(" $('input[name^=\"card_id_lan___\"]').each(function() {\n");
            customHTML.append("     var index = this.name.split('___')[1];\n");
            customHTML.append("     var idLan = $(this).val();\n");
            customHTML.append("     var valorStr = $('input[name=\"card_valor___' + index + '\"]').val();\n");
            customHTML.append("     var dataCard = $('input[name=\"card_data_venc___' + index + '\"]').val();\n");

            customHTML.append("     var codColigada = $('input[name=\"card_cod_coligada___' + index + '\"]').val() || '';\n");
            customHTML.append("     var codFilial = $('input[name=\"card_cod_filial___' + index + '\"]').val() || '';\n");
            customHTML.append("     var empFilial = $('input[name=\"card_empresa___' + index + '\"]').val() || '';\n");
            customHTML.append("     var nomeFilial = (empFilial.indexOf(' - ') > -1) ? empFilial.split(' - ')[1] : empFilial;\n");
            customHTML.append("     var textoColigadaFilial = codColigada + ' - ' + codFilial + ' - ' + nomeFilial;\n");

            customHTML.append("     if(idLan && valorStr) {\n");
            customHTML.append("         var tr = '<tr><td>' + idLan + '</td><td>' + textoColigadaFilial + '</td><td class=\"text-right\">' + valorStr + '</td></tr>';\n");
            customHTML.append("         tbody.append(tr);\n");
            customHTML.append("         var valorFloat = parseFloat(valorStr.replace(/\\./g, '').replace(',', '.'));\n");
            customHTML.append("         if (!isNaN(valorFloat)) totalAcumulado += valorFloat;\n");
            customHTML.append("         if(dataCard && cabecalhoDataPT && dataCard != cabecalhoDataPT) { datasDiferentes = true; }\n");
            customHTML.append("     }\n");

            // Reconstroi Rateios Individuais dos Cards
            customHTML.append("     var jsonRateio = $('input[name=\"card_json_rateio___' + index + '\"]').val();\n");
            customHTML.append("     if(jsonRateio) { try { var lista = JSON.parse(jsonRateio); var row = $(this).closest('.panel-body'); var tb = row.find('.tbody-rateio-card'); tb.empty(); var tV=0; var tP=0; for(var i=0;i<lista.length;i++){ var it=lista[i]; var v=parseFloat(it.VALOR)||0; var p=parseFloat(it.PERCENTUAL)||0; tV+=v; tP+=p; tb.append('<tr><td>'+it.CODCCUSTO+' - '+it.NOMECCUSTO+'</td><td class=\"text-center\">'+p.toFixed(2)+'%</td><td class=\"text-right\">'+v.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</td></tr>'); } row.find('.total-perc-card').text(tP.toFixed(2)+'%'); row.find('.total-valor-card').text(tV.toLocaleString('pt-BR',{minimumFractionDigits:2})); } catch(e){} }\n");
            customHTML.append(" });\n");

            customHTML.append(" var totalFormatado = totalAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });\n");
            customHTML.append(" $('#lbl_total_consolidado').text(totalFormatado);\n");

            // --- RECALCULAR TEXTOS DE VALIDAÇÃO (Para não ficarem em branco) ---
            customHTML.append(" var cabVal = $('#guia_valor_total').val();\n");
            customHTML.append(" if(cabVal === totalFormatado) { $('#status_guia_valor').val('OK').css({'background-color':'#dff0d8','color':'green'}); $('#detalhe_guia_valor').text('Valores conferem.').css('color','green'); } else { var vc=parseFloat(cabVal.replace(/\\./g,'').replace(',','.'))||0; var vs=parseFloat(totalFormatado.replace(/\\./g,'').replace(',','.'))||0; var dif=(vc-vs).toLocaleString('pt-BR',{minimumFractionDigits:2}); $('#status_guia_valor').val('DIVERGENTE').css({'background-color':'#f2dede','color':'red'}); $('#detalhe_guia_valor').text('Dif: '+dif).css('color','red'); }\n");
            customHTML.append(" if(!cabecalhoDataPT) { $('#status_guia_data').val('PENDENTE').css({'background-color':'#f2dede','color':'red'}); } else if(datasDiferentes) { $('#status_guia_data').val('DIVERGENTE').css({'background-color':'#f2dede','color':'red'}); $('#detalhe_guia_data').text('Datas diferem.').css('color','red'); } else { $('#status_guia_data').val('OK').css({'background-color':'#dff0d8','color':'green'}); $('#detalhe_guia_data').text('Datas conferem.').css('color','green'); }\n");

        }
        // === LÓGICA PARA CNAB ===
        else {
            customHTML.append(" $('#campos_originais_cnab, #row_cnab_inputs, #painel_leitura, #painel_erp, #painel_rateio, #painel_resumo, #container_resumo_cnab').show();\n");
            customHTML.append(" $('#row_guia_header, #painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia').hide();\n");

            // Recálculo visual dos totais de Rateio
            customHTML.append(" var totalValRateio = 0; var totalPercRateio = 0;\n");
            customHTML.append(" $('input[name^=\"rateio_valor___\"]').each(function() {\n");
            customHTML.append("     var v = $(this).val();\n");
            customHTML.append("     if(v) { var vf = parseFloat(v.replace(/\\./g, '').replace(',', '.')) || 0; totalValRateio += vf; }\n");
            customHTML.append("     var index = this.name.split('___')[1];\n");
            customHTML.append("     var p = $('input[name=\"rateio_percentual___' + index + '\"]').val();\n");
            customHTML.append("     if(p) { var pf = parseFloat(p.replace('%', '').replace(',', '.')) || 0; totalPercRateio += pf; }\n");
            customHTML.append(" });\n");
            customHTML.append(" $('#rateio_total_calculado').val(totalValRateio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));\n");
            customHTML.append(" $('#rateio_total_percentual').val(totalPercRateio.toFixed(2) + '%');\n");

            // Reaplicar cores de validação (CNAB)
            customHTML.append(" var camposCheck = ['chk_empresa', 'chk_cnpj', 'chk_banco', 'chk_data_cred', 'chk_valor'];\n");
            customHTML.append(" $.each(camposCheck, function(i, campo) {\n");
            customHTML.append("     var el = $('input[name=\"' + campo + '\"]');\n");
            customHTML.append("     var val = el.val();\n");
            customHTML.append("     if(val == 'OK') { el.css({'background-color': '#dff0d8', 'color': 'green', 'font-weight': 'bold'}); }\n");
            customHTML.append("     else if(val && val != '') { el.css({'background-color': '#f2dede', 'color': 'red', 'font-weight': 'bold'}); }\n");
            // Recupera mensagens de detalhe (caso tenha lógica visual extra)
            customHTML.append("     var msgId = campo.replace('chk_', 'msg_');\n");
            customHTML.append("     if(val == 'OK') $('#' + msgId).text('Confere').css('color', 'green');\n");
            customHTML.append("     else if(val == 'DIVERGENTE') $('#' + msgId).text('Divergente').css('color', 'red');\n");
            customHTML.append(" });\n");
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

        customHTML.append(" $('#painel_resumo_geral').show();\n");
    }

// =========================================================================
    // ATIVIDADE 40: ENVIO FINANCEIRO (ARQUIVO VAN)
    // =========================================================================
    if (atividade == 40) {
        // Como o script e o document.ready já foram abertos na linha 35/36, injetamos direto!
        customHTML.append("     $('#painel_leitura, #painel_erp, #painel_rateio, #painel_resumo, #painel_multi_lancamentos, #painel_consolidado_guia, #container_resumo_guia, #row_cnab_inputs, #painel_resumo_14, #painel_retornos_fileserver').hide(); \n");
        customHTML.append("     $('#painel_info').find('input, select, button').prop('disabled', true); \n");
        // Mostra os nossos novos painéis
        customHTML.append("     $('#painel_envio_van_40, #painel_retorno_van_40, #painel_status_geral_40, #painel_aprovacao_40').show(); \n");
        customHTML.append("     setTimeout(function(){ if(typeof iniciarPainelVan40 === 'function'){ iniciarPainelVan40(); } }, 500); \n");
    }

    

    // FECHAMENTO CORRETO DO $(document).ready ABERTO NA LINHA 36
    customHTML.append("});\n");
    
    // FECHAMENTO DA TAG <script> ABERTA NA LINHA 35
    customHTML.append("</script>\n");


}
