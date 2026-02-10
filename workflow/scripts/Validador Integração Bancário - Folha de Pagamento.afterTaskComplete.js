function afterTaskComplete(colleagueId, nextSequenceId, userList) {
    var atividade = getValue("WKNumState");
    
    // Se for a atividade de envio (12)
    if (atividade == 12) {
        var usuario = getValue("WKUser");
        // Grava no campo que criamos no HTML
        hAPI.setCardValue("cpResponsavelEnvio", usuario);
    }
}