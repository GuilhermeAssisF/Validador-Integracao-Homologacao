function afterTaskCreate(colleagueId) {
    var atividade = parseInt(getValue("WKNumState"));
    var ATIVIDADE_FINANCEIRO = 12; 

    if (atividade == ATIVIDADE_FINANCEIRO) {
        var nrProcesso = getValue("WKNumProces");
        var thread = 0; 
        
        // CORREÇÃO PRINCIPAL: 
        // Pega o primeiro usuário da lista de responsáveis que recebeu a tarefa 12
        var responsavelDestino = colleagueId.get(0); 

        var dataTexto = "";
        var tipoDoc = hAPI.getCardValue("tipo_documento");
        
        // Busca a data conforme o tipo
        if (tipoDoc == "cnab") {
            dataTexto = hAPI.getCardValue("arq_data_cred"); 
        } else {
            // Tratamento para data da guia (YYYY-MM-DD ou DD/MM/YYYY)
            var dataGuia = hAPI.getCardValue("guia_data_venc");
            if (dataGuia && dataGuia.indexOf("-") > -1) {
                var partes = dataGuia.split("-");
                dataTexto = partes[2] + "/" + partes[1] + "/" + partes[0];
            } else {
                dataTexto = dataGuia;
            }
        }

        if (dataTexto && dataTexto != "") {
            try {
                var prazoDate = converterParaData(dataTexto);
                
                // Define 10:00 da manhã
                prazoDate.setHours(10);
                prazoDate.setMinutes(0);
                prazoDate.setSeconds(0);

                // Define o prazo para o RESPONSÁVEL DE DESTINO
                hAPI.setDueDate(nrProcesso, thread, responsavelDestino, prazoDate, 0);
                
                log.info("### VALIDADOR FINANCEIRO: Prazo definido para " + prazoDate + " | Responsavel: " + responsavelDestino);
            } catch (e) {
                log.error("### VALIDADOR FINANCEIRO: Erro ao definir data: " + e);
            }
        } else {
            log.warn("### VALIDADOR FINANCEIRO: Data para prazo vazia. Atividade 12 ficará sem prazo calculado.");
        }
    }
}

function converterParaData(dataStr) {
    if (!dataStr) return new Date();
    var partes = dataStr.split("/");
    return new Date(partes[2], partes[1] - 1, partes[0]);
}