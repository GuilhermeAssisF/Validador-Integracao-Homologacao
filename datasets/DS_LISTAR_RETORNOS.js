function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("Nome_do_Arquivo");
    dataset.addColumn("Tamanho");
    dataset.addColumn("Data_Modificacao");

    try {
        // Removemos o importClass do Date para evitar colisão com o JS
        importClass(Packages.java.io.File);
        importClass(Packages.java.text.SimpleDateFormat);

        // =========================================================
        // CAMINHO DO FILESERVER (Pasta Retorno - BPO Interativa)
        // =========================================================
        var pathRetorno = "\\\\\\\\sotersrv38\\\\FileServer\\\\RH\\\\03. Dpto Pessoal\\\\24. BPO - Interativa\\\\Retorno\\\\";
        
        var pasta = new File(pathRetorno);

        if (pasta.exists() && pasta.isDirectory()) {
            
            var arquivos = pasta.listFiles();
            var formatadorData = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");

            if (arquivos != null && arquivos.length > 0) {
                for (var i = 0; i < arquivos.length; i++) {
                    var arq = arquivos[i];
                    
                    if (arq.isFile()) {
                        var nome = arq.getName();
                        var tamanhoKB = Math.round(arq.length() / 1024) + " KB";
                        
                        // Usamos o caminho completo 'java.util.Date' diretamente na chamada
                        var dataMod = formatadorData.format(new java.util.Date(arq.lastModified()));
                        
                        dataset.addRow([nome, tamanhoKB, dataMod]);
                    }
                }
            } else {
                dataset.addRow(["Aviso", "A pasta está vazia", "-"]);
            }
        } else {
            dataset.addRow(["Erro", "Diretório não encontrado ou sem permissão", "-"]);
        }
    } catch (e) {
        log.error("### ERRO DS_LISTAR_RETORNOS: " + e);
        dataset.addRow(["Erro_Exception", e.toString(), "-"]);
    }

    return dataset;
}