function Zoom() {
  var Element = this;
  this.Id = "Temp";
  this.Titulo = "";
  this.DataSet = "colleague";
  this.FieldsName = [];
  this.Renderizado = false;
  this.Colunas = new Array({ title: "NOME", name: "colleagueName", display: true });
  this.RegistrosPorPagina = 8;
  this.Width = 660;
  this.Linhas = [];
  this.UseTemplate = false;
  this.Template = "";
  this.page = 1;
  this.totalPags = 1;
  this.rawFilters = {};
  this.preData = null;

  this.Abrir = function () {
    this.RenderizarModal();
    $("#" + this.Id + "_Modal").modal("show");
    setTimeout(function () { Element.BuscarDados(); }, 300);
    this.Renderizado = true;
    $(".container-modal").css({ zIndex: "9999", left: "50%", marginTop: "10px", marginLeft: "-" + this.Width / 2 + "px" });
  };

  this.RenderizarModal = function () {
    var html = '<div class="modal" id="' + this.Id + '_Modal" tabindex="-1" role="dialog"><div class="modal-dialog"><div class="modal-content" style="width:' + this.Width + 'px;">';
    html += '<div class="modal-header"><h4 class="modal-title"><span class="fluigicon fluigicon-search-test fluigicon-xl"></span>&nbsp;&nbsp;<b>' + this.Titulo + '</b></h4><div class="searchinput"></div></div>';
    html += '<div class="modal-body" style="height:300px; overflow:auto;"><div id="' + this.Id + '_dataTable"></div><div id="' + this.Id + '_loading"><h3 align="center">Carregando...</h3></div></div>';
    html += '<div class="modal-footer"><button type="button" id="' + this.Id + '_prev" class="btn btn-warning"><</button> [ <span id="' + this.Id + '_pgAtual">1</span> de <span id="' + this.Id + '_pgTotal">1</span> ] <button type="button" id="' + this.Id + '_next" class="btn btn-warning">></button><button type="button" class="btn btn-default" data-dismiss="modal">Fechar</button></div>';
    html += '</div></div></div>';
    $("body").append(html);
  };

  this.Renderizar = function () {
    $("#" + this.Id + "_loading").hide();
    $("#" + this.Id + "_dataTable").show();
    
    // Configuração do Template
    var tpl = "<script type='text/template' class='" + this.Id + "_tpl'>";
    if (this.UseTemplate) { tpl += this.Template; } 
    else {
      tpl += "<tr>";
      for (var col in Element.Colunas) { tpl += "<td style='font-size:12px;'>" + "{{" + Element.Colunas[col].name + "}}" + "</td>"; }
      tpl += "</tr>";
    }
    tpl += "</script>";
    if($("." + this.Id + "_tpl").length === 0) $("body").append(tpl);

    // Configuração Header
    var Headers = [];
    for (var i in Element.Colunas) {
      Headers.push({ title: Element.Colunas[i].title, display: (Element.Colunas[i].display !== false) });
    }

    // Paginação
    var pageData = [];
    var count = 0;
    for (var i = 0; i < Element.Linhas.length; i++) {
        pageData.push(Element.Linhas[i]);
        count++;
        if(count >= Element.RegistrosPorPagina) break;
    }

    this.DataTableObject = FLUIGC.datatable("#" + this.Id + "_dataTable", {
      dataRequest: pageData,
      renderContent: "." + Element.Id + "_tpl",
      header: Headers,
      search: { 
          enabled: true, 
          onlyEnterkey: true, 
          onSearch: function(term) {
             var filtered = Element.Linhas.filter(function(row) {
                for(var k in Element.Colunas) {
                    var val = row[Element.Colunas[k].name];
                    if(val && val.toUpperCase().indexOf(term.toUpperCase()) >= 0) return true;
                }
                return false;
             });
             Element.DataTableObject.reload(filtered);
             Element.BindClick();
          }
      },
      navButtons: { enabled: false } // Usamos nossos botões customizados
    }, function(err, data) {
        Element.BindClick();
    });
  };

  this.BindClick = function () {
    $("#" + this.Id + "_dataTable tbody tr").click(function () {
      var Data = [];
      $(this).find("td").each(function (i) { Data.push($(this).text()); });
      Element.Retorno(Data);
      $("#" + Element.Id + "_Modal").modal("hide");
    });
  };

  this.setRawFilters = function (c, v) { this.rawFilters[c] = v; };
  this.getFiltros = function () {
    var f = [];
    for (var i = 0; i < Element.FieldsName.length; i++) {
      var name = Element.FieldsName[i];
      if (this.rawFilters[name]) f.push(this.rawFilters[name]);
      else if(document.getElementById(name)) f.push(document.getElementById(name).value);
    }
    return f;
  };

  this.BuscarDados = function () {
    try {
      if (this.Linhas.length === 0) {
        var tabela = this.preData;
        if (!tabela) {
             // CORREÇÃO CRÍTICA: CHAMADA DIRETA SEM DEPENDER DE COMPARTILHADOS.JS
             // O 2º parâmetro (fields) é usado pelo Dataset customizado para receber filtros
             tabela = DatasetFactory.getDataset(Element.DataSet, Element.getFiltros(), null, null);
        }

        if (!tabela || !tabela.values || tabela.values.length === 0) {
          throw "Nenhum dado encontrado no Dataset: " + Element.DataSet;
        }
        
        // Validação de erro de dataset vazio (comum retornar 1 linha vazia)
        if (tabela.values.length == 1 && (!tabela.values[0][Element.Colunas[0].name])) {
             throw "Dataset retornou vazio.";
        }

        Element.totalPags = Math.ceil(tabela.values.length / Element.RegistrosPorPagina);
        
        // Converter dados
        for (var i = 0; i < tabela.values.length; i++) {
          var row = {};
          for (var k in Element.Colunas) {
            var field = Element.Colunas[k].name;
            row[field] = (tabela.values[i][field] || "").toString();
          }
          Element.Linhas.push(row);
        }
      }
      this.Renderizar();
      this.bindNewPager();

    } catch (e) {
      console.error(e);
      $("#" + this.Id + "_loading").hide();
      $(".modal-body").prepend('<div class="alert alert-danger">ERRO: ' + (e.message || e) + '</div>');
    }
  };

  this.bindNewPager = function () {
      $("#" + Element.Id + "_pgTotal").text(Element.totalPags);
      $("#" + Element.Id + "_next").click(function() {
          if(Element.page < Element.totalPags) {
              Element.page++;
              Element.updatePage();
          }
      });
      $("#" + Element.Id + "_prev").click(function() {
          if(Element.page > 1) {
              Element.page--;
              Element.updatePage();
          }
      });
  };

  this.updatePage = function() {
      var start = (Element.page - 1) * Element.RegistrosPorPagina;
      var end = start + Element.RegistrosPorPagina;
      var pData = Element.Linhas.slice(start, end);
      Element.DataTableObject.reload(pData);
      $("#" + Element.Id + "_pgAtual").text(Element.page);
      Element.BindClick();
  };
}

/**
 * Função obrigatória do Fluig para retorno de campos tipo ZOOM
 */
function setSelectedZoomItem(selectedItem) {
    // Zoom Global (CNAB) - Mantido conforme original
    if (selectedItem.inputId == "txt_empresa") {
        $("#txt_empresa").val(selectedItem["EMPRESA"]); // Ajustado para pegar o campo EMPRESA
        $("#cod_empresa").val(selectedItem["CODCOLIGADA"]);
        $("#txt_cnpj").val(selectedItem["CNPJ"]);
        $("#txt_filial").val(selectedItem["CODFILIAL"] + " - " + selectedItem["FILIAL"]);
        $("#cod_filial").val(selectedItem["CODFILIAL"]);
    }

    // Zoom na Tabela de Lançamentos (Guia)
    if (selectedItem.inputId.indexOf("item_empresa") > -1) {
        var index = selectedItem.inputId.split("___")[1];
        
        $("[name='item_empresa___" + index + "']").val(selectedItem["EMPRESA"]);
        $("[name='item_cod_coligada___" + index + "']").val(selectedItem["CODCOLIGADA"]);
        $("[name='item_cod_filial___" + index + "']").val(selectedItem["CODFILIAL"]);
    }
}


