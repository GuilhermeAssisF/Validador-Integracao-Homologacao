function validateForm(form) {
    // Garante que o número da atividade seja inteiro
    var atividade = parseInt(getValue("WKNumState"));
    var proximaAtividade = getValue("WKNextState");

    // Recupera valores do formulário
    var temDivergencia = form.getValue("cpTemDivergencia");
    // Recuperamos o status visual do campo empresa para saber se foi OK ou ATENÇÃO
    var statusVisualEmpresa = form.getValue("chk_empresa");

    var checkOk = form.getValue("check_ok");
    var justificativa = form.getValue("txt_justificativa");

    log.info("### VALIDADOR FINANCEIRO: Atividade " + atividade + " | Divergencia: " + temDivergencia + " | Check: " + checkOk);

    // =========================================================================
    // REGRAS DO INÍCIO (Atividade 0 ou 4)
    // =========================================================================
    if (atividade == 0 || atividade == 4) {

        if (temDivergencia == "sim") {
            form.setValue("cpStatusDivergencia", "1"); // 1 = Aberto com Divergência Bloqueante

            var justificativa = form.getValue("txt_justificativa");
            if (justificativa == null || justificativa.trim() == "") {
                throw "Como foram encontradas divergências, é obrigatório preencher a 'Justificativa da Validação'.";
            }
        
        // NOVA CONDIÇÃO PARA O STATUS 3 (AVISO)
        } else if (temDivergencia == "aviso") {
            form.setValue("cpStatusDivergencia", "3"); // 3 = Aviso (Gravado corretamente agora)
            
            // Opcional: Se quiser obrigar justificativa no aviso também, descomente abaixo:
            /*
            var justificativa = form.getValue("txt_justificativa");
            if (justificativa == null || justificativa.trim() == "") {
                throw "Para prosseguir com o Aviso de Divergência, preencha a Justificativa.";
            }
            */

        } else {
            // Se não é "sim" nem "aviso", então é "nao" (Sucesso)
            form.setValue("cpStatusDivergencia", "0"); // 0 = Sem divergência
        }
    }

    // =========================================================================
    // REGRAS DA ATIVIDADE 14: VALIDAR DIVERGÊNCIAS
    // =========================================================================
    if (atividade == 14) {

        // Regra 2: Se está nesta atividade, é OBRIGATÓRIO validar, 
        // independente do que diz o campo cpTemDivergencia (blindagem contra erro de flag)

        if (checkOk != "sim") {
            throw "Para concluir esta etapa, você deve marcar a caixa de seleção: 'CONFIRMO que a validação acima possui divergências...'.";
        }

        if (justificativa == null || justificativa.trim() == "") {
            throw "A justificativa é obrigatória nesta etapa.";
        }

        // Se passou, atualiza o status para Validado
        form.setValue("cpStatusDivergencia", "2"); // 2 = Divergência Validada/Aceita
    }
}