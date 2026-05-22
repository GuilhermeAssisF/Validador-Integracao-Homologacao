function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("STATUS");

    try {
        importClass(Packages.java.io.File);
        var nomeArquivo = "";

        // Captura o nome do arquivo enviado pelo front-end
        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                if (constraints[i].fieldName == "nomeArquivo") {
                    nomeArquivo = constraints[i].initialValue;
                }
            }
        }

        if (nomeArquivo == "") {
            dataset.addRow(["ERRO: NOME_VAZIO"]);
            return dataset;
        }

        // =========================================================
        // CAMINHO DA PASTA 'ENVIADOS' NO SEU AMBIENTE DE TESTE
        // =========================================================
        var pathEnviados = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\24. BPO - Interativa\\\\Enviados\\\\";
        var arquivo = new File(pathEnviados + nomeArquivo);

        // Verifica se o arquivo já existe lá
        if (arquivo.exists()) {
            dataset.addRow(["ENCONTRADO"]);
        } else {
            dataset.addRow(["PENDENTE"]);
        }

    } catch (e) {
        log.error("### ERRO DS_VERIFICAR_ENVIADOS: " + e);
        dataset.addRow(["ERRO: " + e.toString()]);
    }

    return dataset;
}