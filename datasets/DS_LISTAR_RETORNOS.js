function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("Nome_do_Arquivo");
    dataset.addColumn("Tamanho");
    dataset.addColumn("Data_Modificacao");

    try {
        importClass(Packages.java.io.File);
        importClass(Packages.java.text.SimpleDateFormat);

        var pastaSolicitada = "Retorno";
        if (constraints != null) {
            for (var c = 0; c < constraints.length; c++) {
                if (constraints[c].fieldName == "pasta" && constraints[c].initialValue != null && constraints[c].initialValue != "") {
                    pastaSolicitada = String(constraints[c].initialValue);
                }
            }
        }

        // Mantem Retorno como padrao para nao alterar o comportamento atual.
        var pathBase = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\24. BPO - Interativa\\\\";
        var nomePasta = (pastaSolicitada.toLowerCase() == "enviar") ? "Enviar" : "Retorno";
        var pasta = new File(pathBase + nomePasta + "\\\\");

        if (pasta.exists() && pasta.isDirectory()) {
            var arquivos = pasta.listFiles();
            var formatadorData = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");

            if (arquivos != null && arquivos.length > 0) {
                for (var i = 0; i < arquivos.length; i++) {
                    var arq = arquivos[i];

                    if (arq.isFile()) {
                        var nome = arq.getName();
                        var tamanhoKB = Math.round(arq.length() / 1024) + " KB";
                        var dataMod = formatadorData.format(new java.util.Date(arq.lastModified()));

                        dataset.addRow([nome, tamanhoKB, dataMod]);
                    }
                }
            } else {
                dataset.addRow(["Aviso", "A pasta " + nomePasta + " esta vazia", "-"]);
            }
        } else {
            dataset.addRow(["Erro", "Diretorio " + nomePasta + " nao encontrado ou sem permissao", "-"]);
        }
    } catch (e) {
        log.error("### ERRO DS_LISTAR_RETORNOS: " + e);
        dataset.addRow(["Erro_Exception", e.toString(), "-"]);
    }

    return dataset;
}
