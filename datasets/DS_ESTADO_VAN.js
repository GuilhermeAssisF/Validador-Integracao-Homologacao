function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("ARQUIVO");
    dataset.addColumn("STATUS");

    try {
        importClass(Packages.java.io.File);
        importClass(Packages.java.io.FileOutputStream);
        importClass(Packages.java.io.BufferedReader);
        importClass(Packages.java.io.InputStreamReader);
        importClass(Packages.java.io.FileInputStream);

        var acao = "";
        var numProcesso = "";
        var nomeArquivo = "";
        var status = "";

        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                if (constraints[i].fieldName == "acao") acao = constraints[i].initialValue;
                if (constraints[i].fieldName == "numProcesso") numProcesso = constraints[i].initialValue;
                if (constraints[i].fieldName == "nomeArquivo") nomeArquivo = constraints[i].initialValue;
                if (constraints[i].fieldName == "status") status = constraints[i].initialValue;
            }
        }

        if (numProcesso == "" || numProcesso == "0" || numProcesso == null) {
            dataset.addRow(["ERRO", "Número do processo vazio"]);
            return dataset;
        }

        // Caminho Base
        var pathBase = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\24. BPO - Interativa\\\\Controle\\\\";
        
        // NOVIDADE: Verifica se a pasta existe. Se não existir, o Fluig cria!
        var dirControle = new File(pathBase);
        if (!dirControle.exists()) {
            dirControle.mkdirs(); 
        }

        var file = new File(pathBase + "proc_" + numProcesso + ".txt");

        // GRAVAR O ESTADO
        if (acao == "SALVAR") {
            var stream = new FileOutputStream(file);
            var conteudo = new java.lang.String(nomeArquivo + ";" + status);
            stream.write(conteudo.getBytes("UTF-8"));
            stream.close();
            dataset.addRow([nomeArquivo, status]);
        }
        // LIMPAR O ESTADO
        else if (acao == "LIMPAR") {
            if (file.exists()) {
                file["delete"]();
            }
            dataset.addRow(["LIMPO", "LIMPO"]);
        }
        // LER O ESTADO
        else if (acao == "LER") {
            if (file.exists()) {
                var reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"));
                var linha = reader.readLine();
                reader.close();
                
                if (linha != null) {
                    var partes = (linha + "").split(";");
                    dataset.addRow([partes[0], partes[1]]);
                } else {
                    dataset.addRow(["VAZIO", "VAZIO"]);
                }
            } else {
                dataset.addRow(["NAO_EXISTE", "NAO_EXISTE"]);
            }
        }

    } catch (e) {
        log.error("### ERRO DS_ESTADO_VAN: " + e);
        dataset.addRow(["ERRO", e.toString()]);
    }

    return dataset;
}


