function servicetask32(attempt, message) {
    log.info("### SERVICE TASK: Iniciando Integracao ###");

    try {
        // Verifica duplicidade para evitar reprocessamento
        var idJaGerado = hAPI.getCardValue("cpIdProcessoPagamento");
        if (idJaGerado != null && idJaGerado != "" && idJaGerado.length > 3) {
            log.info("### AUTOMACAO: Processos já gerados. Fim.");
            return;
        }

        // --- RECUPERAÇÃO SEGURA DO USUÁRIO ---
        var matriculaSolicitante = hAPI.getCardValue("cpResponsavelEnvio");
        
        // Se veio vazio ou null, usa o fallback para não travar
        if (matriculaSolicitante == null || matriculaSolicitante == "" || matriculaSolicitante == "null") {
            log.warn("### ATENCAO: Usuário de envio não identificado. Usando fallback: soter_ti");
            matriculaSolicitante = "soter_ti"; // Usuário de segurança
        }

        var dadosComuns = getDadosComuns(matriculaSolicitante);
        var tipoDoc = hAPI.getCardValue("tipo_documento");
        var idsProcessosGerados = [];

        if (tipoDoc == "cnab") {
            var coligada = hAPI.getCardValue("cod_empresa");
            var idLan = hAPI.getCardValue("erp_id_lan");
            
            if (validarDados(coligada, idLan)) {
                var id = iniciarProcessoPagamento(coligada, idLan, dadosComuns, matriculaSolicitante);
                idsProcessosGerados.push(id);
            }
        } 
        else if (tipoDoc == "guia_outros") {
            // Em service task, pegamos Pai x Filho via getCardData para garantir
            var mapa = hAPI.getCardData(getValue("WKNumProces"));
            var it = mapa.keySet().iterator();

            while (it.hasNext()) {
                var key = it.next();
                if (key.indexOf("card_id_lan___") > -1) {
                    var index = key.split("___")[1];
                    var idLanItem = mapa.get("card_id_lan___" + index);
                    var coligadaItem = mapa.get("card_cod_coligada___" + index);

                    if (validarDados(coligadaItem, idLanItem)) {
                        var id = iniciarProcessoPagamento(coligadaItem, idLanItem, dadosComuns, matriculaSolicitante);
                        idsProcessosGerados.push(id);
                        
                        try { hAPI.setCardValue("card_id_processo___" + index, id + ""); } catch(e){}
                    }
                }
            }
        }

        if (idsProcessosGerados.length > 0) {
            hAPI.setCardValue("cpIdProcessoPagamento", idsProcessosGerados.join(", "));
        } else {
            // Se não gerou nada, lançamos erro para aparecer no log/monitoramento
            throw "Nenhum processo foi gerado. Verifique se os dados do formulário estão preenchidos corretamente (IDs e Coligadas).";
        }

    } catch (e) {
        log.error("ERRO SERVICE TASK: " + e);
        throw e;
    }
}

// --- FUNÇÕES AUXILIARES ---

function iniciarProcessoPagamento(coligada, idLan, dadosComuns, userDestino) {
    var formData = new java.util.HashMap();
    formData.put("numColigada", coligada);
    formData.put("idlan", idLan);
    formData.put("txtColigada", coligada); 
    formData.put("cpDataAbertura", dadosComuns.data);
    formData.put("cpMatriculaSolicitante", dadosComuns.matricula);
    formData.put("cpSolicitanteNome", dadosComuns.nome);
    formData.put("obs_integracao", "Gerado auto via Validador #" + getValue("WKNumProces"));

    var usuarios = new java.util.ArrayList();
    usuarios.add(userDestino);

    var retorno = hAPI.startProcess("FLUIG-0010", 0, usuarios, "Iniciado via Validador", true, formData, false);
    return retorno.get("iProcess");
}

function validarDados(coligada, idLan) {
    return (coligada != null && coligada != "" && idLan != null && idLan != "");
}

function getDadosComuns(matricula) {
    var nome = "Sistema";
    try {
        var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", matricula, matricula, ConstraintType.MUST);
        var ds = DatasetFactory.getDataset("colleague", ["colleagueName"], [c1], null);
        if (ds.rowsCount > 0) nome = ds.getValue(0, "colleagueName");
    } catch (e) {}
    
    // --- CORREÇÃO AQUI (Removido padStart) ---
    var dt = new Date();
    var dia = dt.getDate();
    var mes = dt.getMonth() + 1;
    var ano = dt.getFullYear();
    
    // Formatação manual compatível com Rhino (Java 1.6/1.7 style)
    var diaFmt = (dia < 10) ? "0" + dia : dia;
    var mesFmt = (mes < 10) ? "0" + mes : mes;
    
    return { 
        matricula: matricula, 
        nome: nome, 
        data: diaFmt + "/" + mesFmt + "/" + ano 
    };
}