function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("linha");
    dataset.addColumn("conteudo");
    dataset.addColumn("status"); // OK ou ERRO

    try {
        importClass(Packages.java.io.File);
        importClass(Packages.java.io.BufferedReader);
        importClass(Packages.java.io.InputStreamReader);
        importClass(Packages.java.io.FileInputStream);

        var nomeArquivo = "";
        
        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                // CORREÇÃO: Usando '==' no lugar de '===' para evitar o conflito de tipos Java vs JS
                if (constraints[i].fieldName == "nomeArquivo") {
                    nomeArquivo = constraints[i].initialValue;
                }
            }
        }

        if (nomeArquivo == "") {
            dataset.addRow([0, "", "ERRO: Nome do arquivo não informado."]);
            return dataset;
        }

        // =========================================================
        // CAMINHO DO FILESERVER (Pasta Retorno - Bradesco)
        // =========================================================
        var pathBase = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\\\02 - BRAD_Retorno_Automatico\\\\Retornos\\\\Pagamento\\\\";
        var arquivo = new File(pathBase + nomeArquivo);

        if (!arquivo.exists()) {
            dataset.addRow([0, "", "ERRO: Arquivo não encontrado na rede."]);
            return dataset;
        }

        // Arquivos bancários geralmente são ISO-8859-1
        var reader = new BufferedReader(
            new InputStreamReader(new FileInputStream(arquivo), "ISO-8859-1")
        );

        var linha;
        var numero = 0;
        while ((linha = reader.readLine()) != null) {
            numero++;
            // Instancia explicitamente a String do JS para evitar colisão com Java
            dataset.addRow([numero, new java.lang.String(linha), "OK"]);
        }
        
        reader.close();

    } catch (e) {
        log.error("### ERRO DS_LER_RETORNO: " + e);
        dataset.addRow([0, "", "ERRO: " + e.toString()]);
    }

    return dataset;
}

