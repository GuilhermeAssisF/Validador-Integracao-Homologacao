function afterTaskComplete(colleagueId, nextSequenceId, userList) {
    var atividade = getValue("WKNumState");

    // Se for a atividade de envio (12)
    if (atividade == 12) {
        // Grava o responsável (sua lógica original mantida)
        var usuario = getValue("WKUser");
        hAPI.setCardValue("cpResponsavelEnvio", usuario);

        try {
            log.info("### INICIANDO ENVIO DE E-MAIL AUTOMÁTICO - TASK 12 ###");

            // 1. Coleta os dados que já foram gerados no formulário pelo custom.js
            var assunto = hAPI.getCardValue("txt_assunto_email");
            var corpoTexto = hAPI.getCardValue("texto_email_resumo");

            // Substitui quebras de linha (\n) por tag HTML (<br>) para o e-mail não perder a formatação
            var corpoHtml = new java.lang.String(corpoTexto).replaceAll("\n", "<br>");

            // 2. Prepara os parâmetros que serão injetados no Template HTML
            var parametros = new java.util.HashMap();
            parametros.put("subject", assunto); // Sobrescreve o assunto padrão do Fluig
            parametros.put("CORPO_EMAIL", corpoHtml);

            // 3. Define os destinatários
            var destinatarios = new java.util.ArrayList();

            // Pega o e-mail do solicitante original do formulário
            // var emailSolicitante = hAPI.getCardValue("cpEmailSolicitante");
            // if(emailSolicitante != null && emailSolicitante != "") {
            //     destinatarios.add(emailSolicitante);
            // }

            // Se quiser enviar para uma cópia fixa, descomente a linha abaixo:
            destinatarios.add("assisguilhermefernandes@gmail.com");

            // 4. Captura todos os anexos físicos do processo (A Guia ou o CNAB)
            var anexos = new java.util.ArrayList();
            var docs = hAPI.listAttachments();

            for (var i = 0; i < docs.size(); i++) {
                var doc = docs.get(i);

                // Ignora anexos do tipo pasta (documentType == 2)
                if (doc.getDocumentType() != "2") {
                    var anexo = new java.util.HashMap();
                    anexo.put("processAttachmentPK.attachmentSequence", doc.getDocumentId());
                    anexos.add(anexo);
                }
            }

            // 5. Executa o disparo do E-mail
            // Parâmetros: remetente, id_do_template, parametros_html, destinatarios, anexos
            // Teste provisório: Dispara sem o array de anexos
            notifier.notify("admin", "tpl_envio_financeiro", parametros, destinatarios, "text/html");

            log.info("### E-MAIL ENVIADO COM SUCESSO ###");

        } catch (e) {
            log.error("### ERRO AO ENVIAR E-MAIL AUTOMÁTICO (Task 12): " + e);
        }
    }
}