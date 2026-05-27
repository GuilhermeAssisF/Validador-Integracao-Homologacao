var BradescoStrategy = {
    name: "CNAB 240 - Bradesco (SOTER)",

    processar: function (conteudoArquivo) {

        var linhas = conteudoArquivo.split('\n').filter(function (l) { return l.trim().length > 0 });
        if (linhas.length < 1) throw new Error("Arquivo vazio ou inválido.");

        var linha1 = linhas[0];

        // 1. CÓDIGO DO BANCO: Posição 0 a 3
        var rawCodigoBanco = linha1.substring(0, 3);

        // 2. CNPJ: Posição 19 a 32 (Índice 18 a 32)
        var rawCnpj = linha1.substring(18, 32).trim();

        // 3. CONVÊNIO (NOVO): Posição 33 a 52 (Índice 32 a 52) - 20 Posições
        // Pega os 6 dígitos (582403) e remove os espaços à direita
        var rawConvenio = linha1.substring(32, 52).trim();

        // 4. AGÊNCIA... (Mantenha o restante inalterado)
        var rawAgencia = linha1.substring(52, 57).trim();
        var dvAgencia = linha1.substring(57, 58).trim();

        var rawConta = linha1.substring(58, 70).replace(/^0+/, "");
        var dvConta = linha1.substring(70, 71).trim();
        var contaFinal = rawConta + (dvConta ? "-" + dvConta : "");

        var nomeEmpresa = linha1.substring(72, 102).trim();
        var nomeBanco = linha1.substring(102, 132).trim();
        if (nomeBanco === "") nomeBanco = "BRADESCO";

        // DATA (Segmento A)
        var dataVisual = "";
        var linhaSegmentoA = linhas.find(function (l) { return l.length > 15 && l.charAt(13) === 'A'; });
        if (!linhaSegmentoA && linhas.length > 2) linhaSegmentoA = linhas[2];
        if (linhaSegmentoA) {
            var dataRaw = linhaSegmentoA.substring(93, 101);
            if (dataRaw && dataRaw.length === 8 && !isNaN(parseFloat(dataRaw))) {
                dataVisual = dataRaw.substring(0, 2) + "/" + dataRaw.substring(2, 4) + "/" + dataRaw.substring(4, 8);
            }
        }

        // VALOR (/100)
        var linhaTrailer = linhas.find(function (l) { return l.length > 8 && l.charAt(7) === '5'; });
        if (!linhaTrailer) linhaTrailer = linhas[linhas.length - 2] || linhas[linhas.length - 1];
        var valorFinal = "0,00";
        if (linhaTrailer) {
            var rawValor = linhaTrailer.substring(23, 41);
            var valorFloat = parseFloat(rawValor) / 100;
            if (!isNaN(valorFloat)) {
                valorFinal = valorFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }

        return {
            strategyName: this.name,
            codigoBanco: rawCodigoBanco,
            empresa: nomeEmpresa,
            cnpj: rawCnpj,
            convenio: rawConvenio, // <--- Retorna o Convênio
            banco: nomeBanco,
            agencia: rawAgencia + (dvAgencia ? "-" + dvAgencia : ""),
            conta: contaFinal,
            dataCredito: dataVisual,
            valor: valorFinal
        };
    }
};


