function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("STATUS");
    dataset.addColumn("MENSAGEM");

    try {
        // Usamos as classes nativas do Java (As mesmas usadas no seu DS_LER_RETORNO.js)
        importClass(Packages.java.io.File);
        importClass(Packages.java.io.FileOutputStream);
        importClass(Packages.org.apache.commons.codec.binary.Base64);

        var nomeArquivo = "";
        var conteudoB64 = "";

        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                if (constraints[i].fieldName == "nomeArquivo") {
                    nomeArquivo = constraints[i].initialValue;
                }
                if (constraints[i].fieldName == "conteudoB64") {
                    conteudoB64 = constraints[i].initialValue;
                }
            }
        }

        if (nomeArquivo == "" || conteudoB64 == "") {
            dataset.addRow(["ERRO", "Nome do arquivo ou conteúdo não informados."]);
            return dataset;
        }

        // Decodifica o Base64 sem conflito de String
        var javaString = new java.lang.String(conteudoB64);
        var bytes = Base64.decodeBase64(javaString.getBytes("UTF-8"));

        // =========================================================
        // CAMINHO DO FILESERVER (Pasta Enviar - Produção)
        // =========================================================
        // O Javascript exige 4 barras para representar 2 na rede (\\\\ = \\)
        var pathEnvio = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\00- ARQUIVOS DE PAGAMENTO FINANCEIRO\\\\02 - BRAD_Retorno_Automatico\\\\Enviar\\\\"; 
        
        var caminhoCompleto = pathEnvio + nomeArquivo;

        // Cria o arquivo e grava os bytes
        var fileOut = new File(caminhoCompleto);
        var stream = new FileOutputStream(fileOut);
        
        stream.write(bytes);
        stream.close();

        dataset.addRow(["OK", "Arquivo " + nomeArquivo + " gravado com sucesso no FileServer!"]);

    } catch (e) {
        log.error("### ERRO DS_ENVIAR_REMESSA_VAN: " + e);
        dataset.addRow(["ERRO", e.toString()]);
    }

    return dataset;
}

