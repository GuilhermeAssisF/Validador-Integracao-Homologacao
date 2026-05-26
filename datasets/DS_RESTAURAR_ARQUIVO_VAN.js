function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("linha");
    dataset.addColumn("conteudo");
    dataset.addColumn("status");

    try {
        importClass(Packages.java.io.File);
        importClass(Packages.java.io.BufferedReader);
        importClass(Packages.java.io.InputStreamReader);
        importClass(Packages.java.io.FileInputStream);

        var nomeArquivo = "";
        var pastaInicial = "Enviar"; 

        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                if (constraints[i].fieldName == "nomeArquivo") nomeArquivo = constraints[i].initialValue;
                if (constraints[i].fieldName == "pasta") pastaInicial = constraints[i].initialValue;
            }
        }

        if (nomeArquivo == "") {
            dataset.addRow([0, "", "ERRO: Nome não informado"]);
            return dataset;
        }

        // NOVO CAMINHO BASE DE PRODUÇÃO
        var pathBase = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\\\02 - BRAD_Retorno_Automatico\\\\" + pastaInicial + "\\\\";
        var arquivo = new File(pathBase + nomeArquivo);

        if (!arquivo.exists()) {
            var outraPasta = (pastaInicial == "Enviar") ? "Enviados" : "Enviar";
            pathBase = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\\\02 - BRAD_Retorno_Automatico\\\\" + outraPasta + "\\\\";
            arquivo = new File(pathBase + nomeArquivo);
            
            if (!arquivo.exists()) {
                dataset.addRow([0, "", "ERRO: Arquivo não encontrado na rede"]);
                return dataset;
            }
        }

        var reader = new BufferedReader(new InputStreamReader(new FileInputStream(arquivo), "ISO-8859-1"));
        var linha;
        var numero = 0;
        
        while ((linha = reader.readLine()) != null) {
            numero++;
            dataset.addRow([numero, linha + "", "OK"]);
        }
        reader.close();

    } catch (e) {
        log.error("### ERRO DS_RESTAURAR_VAN: " + e);
        dataset.addRow([0, "", "ERRO: " + e.toString()]);
    }

    return dataset;
}