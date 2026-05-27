function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("Nome_do_Arquivo");
    dataset.addColumn("Tamanho");
    dataset.addColumn("Data_Modificacao");

    try {
        importClass(Packages.java.io.File);
        importClass(Packages.java.text.SimpleDateFormat);

        var caminhoPasta = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\\\02 - BRAD_Retorno_Automatico\\\\Enviados\\\\";
        var pasta = new File(caminhoPasta);

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
                dataset.addRow(["Aviso", "A pasta Enviados esta vazia", "-"]);
            }
        } else {
            dataset.addRow(["Erro", "Diretorio Enviados nao encontrado ou sem permissao", "-"]);
        }
    } catch (e) {
        log.error("### ERRO DS_LISTAR_ENVIADOS_VAN: " + e);
        dataset.addRow(["Erro_Exception", e.toString(), "-"]);
    }

    return dataset;
}
