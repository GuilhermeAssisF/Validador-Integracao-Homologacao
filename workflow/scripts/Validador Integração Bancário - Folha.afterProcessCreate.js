function afterProcessCreate(processId) {
    var codColigada = hAPI.getCardValue("cod_empresa");
    var codFilial = hAPI.getCardValue("cod_filial");
    var idLan = hAPI.getCardValue("erp_id_lan");

    // Verifica se tem os dados para não gravar registros vazios
    if (codColigada != "" && codFilial != "" && idLan != "") {
        log.info("### REGISTRANDO DUPLICIDADE: Processo " + processId);
        
        // Manda o Dataset Gravar
        var cOp = DatasetFactory.createConstraint("OPERACAO", "GRAVAR", "GRAVAR", ConstraintType.MUST);
        var c1 = DatasetFactory.createConstraint("COD_COLIGADA", codColigada, codColigada, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("COD_FILIAL", codFilial, codFilial, ConstraintType.MUST);
        var c3 = DatasetFactory.createConstraint("ID_LAN", idLan, idLan, ConstraintType.MUST);
        var c4 = DatasetFactory.createConstraint("SOLICITACAO", processId + "", processId + "", ConstraintType.MUST);
        
        DatasetFactory.getDataset("DS_VERIFICAR_DUPLICIDADE", null, [cOp, c1, c2, c3, c4], null);
    }
}