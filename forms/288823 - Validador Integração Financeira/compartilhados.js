var Compartilhados = (function() {
	
	/*
	// FUNÇÕES COMPARTILHADAS PARA USO DE DATASETS
	//  ALEM DE PADRONIZAR RESOLVE OS SEGUINTES PROBLEMAS
	// - FORÇA A UTILIZAÇÃO DO USUARIO ADM COMO EXECUTOR ASSIM EVITANDO DAR PERMISSÃO DIRETA NOS FORMULARIOS
	// - FAZ UM CACHE DE RAPIDA UTLIZAÇÃO, ASSIM EVITANDO ACESSOS DESNECESSARIOS E OTIMIZANDO A RESPOSTA POS PRIMEIRO ACESSO
	// - AUTOR: LEANDRO LUIZ DE SOUZA - 17-10-2017
	// - ULTIMA UTILIZAÇÃO: LEANDRO LUIZ DE SOUZA - 17-10-2017
	*/
	
	var cache = {};
	
    var getCacheDataSet = function(dataset, filter) 
	{
        return (cache[dataset] && cache[dataset][filter]) ? cache[dataset][filter] : false;
    };
    
    var setCacheDataSet = function(dataset, filter, value) 
	{
        if (!cache[dataset]) { cache[dataset] = {} };
        
        cache[dataset][filter] = value;
        
        return value;
    };
    
    // --- CORREÇÃO APLICADA: Removida a constraint fixa de usuário ---
    var searchCustomDataset = function(dataset, filter) 
	{
        // Utiliza o usuário logado para a consulta, garantindo permissão correta
        return DatasetFactory.getDataset(dataset, filter, null, null);
    };
    
    var searchFluigDataset = function(dataset, filter) 
	{
        return getDatasetValues(dataset, filter);
    };
    
    var defaultGetDataSet = function(dataset, filter, loader) 
	{
        return getCacheDataSet(dataset, filter) || loader(dataset, filter);
    };
	
    /*
	// FIM - FUNÇÕES COMPARTILHADAS PARA USO DE DATASETS
	*/
	
	window.loadingLayer = FLUIGC.loading(
		window,
		{textMessage: '<h3>Carregando...</h3>',
				title: null,
				fadeIn: 200,
				fadeOut: 400,
				cursorReset: 'default',
				baseZ: 1000,
				centerX: true,
				centerY: true,
				bindEvents: true,
				timeout: 0,
				showOverlay: true,
				onBlock: null,
				onUnblock: null,
				ignoreIfBlocked: false,
		css: {
       padding: 0,
					margin: 0,
					width: '30%',
					top: '40%',
					left: '35%',
					textAlign: 'center',
					color: '#000000',
					border: '1px solid #001e65',
					backgroundColor: '#ffffff',
					cursor: 'wait',
					opacity: 1.0
		},
		overlayCSS:  { 
			backgroundColor: '#001e65', 
			opacity:         0.4, 
			cursor:          'wait'
		}});
		
	var  getParameterUrlByName = function (name, url) 
	{
		if (!url) 
		{
			url = window.location.href;
		}
		console.log(url);
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	};
	
	var  refreshNumProcessWrong = function (name, url) 
	{
		var currentState = getWKNumState();
		if(currentState != 0 || currentState != 1)
		{
			var NumProcessUrl = window.WKNumProces;//Compartilhados.getParameterUrlByName('WDNrDocto');
			var numberProcessField = $('#cpNumeroSolicitacao').val();
			var numProcessField = $('#cpNumSolicitacao').val();
			var numProcess_ = 0;
			
			if(numberProcessField != '')
			{
				numProcess_ = numberProcessField;
			}
			else if(numProcessField != '')
			{
				numProcess_ = numProcessField;
			}
			
			if(NumProcessUrl != 'null')
			{
				if(numProcess_ != 0)
				{
					if(NumProcessUrl != numProcess_)
					{
							location.reload(true);
					}
				}
			}
		}
	};
		
	var getTemplateFormPrint = function(html) {

		$.ajax({
			url: html,
			async: false,
			success: function(viewData) {
				template = viewData;
				Mustache.parse(template);
			}
		});
		
		return template;
	};

	var getViewFormPrint = function(dados,html) {
		var tpl = getTemplateFormPrint(html);
		return Mustache.render(tpl, dados);
	};

	var PrintFormOpen = function(dados,html) {
		var view = getViewFormPrint(dados,html);
		var avisoWindow = window.open('', '');
		avisoWindow.document.write(view);
		avisoWindow.focus();
		return true;
	};
	

	var destacaAprovacoes = function() {
		var cores = ['default', 'success', 'danger', 'warning'];
		var cor = 0;

		$("[aprovacao]").each(function() 
		{

			if (this.value != 'undefined' && this.value != '' && this.value != '0') 
			{
				cor = this.value;
			}
			else
			{
				cor = 0;
			}

			$(this).closest('.panel').removeClass('panel-default').addClass('panel-' + cores[cor]);
		});
	};
	
	var destacaAprovacoesCheckBox = function() {
		var cores = ['default', 'success', 'danger', 'warning'];
		var cor = 0;

		$("[aprovacao]").each(function() {

			if (this.checked) {
				cor = 1;
			}
			else
			{
				cor = 0;
			}

			$(this).closest('.panel').removeClass('panel-default').addClass('panel-' + cores[cor]);
		});
	};

	var destacaParecer = function() {
		var new_span = '&nbsp;&nbsp;<span class="label label-warning">Cont&eacute;m Parecer</span>';

		$("[parecer]").each(function() {
			if (this.value) {
				$(this).closest('.panel').find('.panel-title').append(new_span);
			}
		});
	};
	
	var camposObrigatorio = function() {
		var new_span = '<span class="CampoObrigatorio" data-placement="right" title="Campo obrigatório"> *</span>';
		$("[obrigatorio]").each(function() {
				$(this).closest('.form-group').find('.labelField').append(new_span);
		});
	};
	
	var carregaDescricaoProcesso = function(codProcesso){
		
		 var c1 = DatasetFactory.createConstraint('processDefinitionPK.processId', codProcesso, codProcesso, ConstraintType.MUST),
		 			c3 = DatasetFactory.createConstraint("userSecurityId", "soter_ti", "adm", ConstraintType.MUST);
        var descricao = DatasetFactory.getDataset('processDefinition', ['processDescription'], [c1,c3]).values[0].processDescription;
        $(".descricaoProcesso").html(descricao);
    };
	
	 var expandePainel = function(atividade){
        $('#panelAtividade_' + atividade).collapse("show").closest(".panel");
    };
	
    var getCodigoManual = function(codigoProcesso) {
        var c1 = DatasetFactory.createConstraint('advancedProcessPropertiesPK.processId', codigoProcesso, codigoProcesso, ConstraintType.MUST),
            c2 = DatasetFactory.createConstraint('advancedProcessPropertiesPK.propertyId', 'NumeroManual', 'NumeroManual', ConstraintType.MUST),
			c3 = DatasetFactory.createConstraint("userSecurityId", "soter_ti", "adm", ConstraintType.MUST);
        return DatasetFactory.getDataset('advancedProcessProperties', ['propertieValue'], [c1, c2, c3]).values[0].propertieValue;
    };

    var carregaManual = function(codigoProcesso, targetElement) {
        // Nota: URL original mantida, verifique se está correta
        var urlPrefix = "http://192.168.7.104:8080/portal/p/1/ecmnavigation?app_ecm_navigation_doc=";
        var numeroManual = getCodigoManual(codigoProcesso);
        $("#" + targetElement).attr('href', urlPrefix + numeroManual);
    };
	
	var mostrarReabertura = function(currentState, validatedState)
	{
		if (currentState == validatedState)
		{
			$('#divReabertura').show();
		}
		else
		{
			$('#divReabertura').hide();
		}
	};
	
	var validaCamposObrigatorio = function() {
		var texto = '';
		$("[obrigatorio]").each(function() {
			if($(this).val() != '')
			{
				texto = '/nO campo ' +$(this).closest('.form-group').find('.labelField').text() + ' e obrigatório.';
				
			}
		});
		
		FLUIGC.toast({
					title: 'CAMPOS NÃO PREENCHIDOS',
					message: texto,
					type: 'success'
				});
	};
	
	var getTokenTWM = function() 
	{
			var token = "";
			var settings = 
			{
			  "async": true,
			   method: "POST",
			  "crossDomain": true,
			  "url": "https://direcional.telecomwm.com.br/oauth/token",
			  "headers": {
				  "content-type": "application/x-www-form-urlencoded",
			  },
			  "data": 
			  {
				  "grant_type": "password",
				  "username": "leandro.souza",
				  "password": "hgsuGFtOOe"
			  }
			};
			
			$.ajax(settings).done(function (response) 
			{
				console.log(response.access_token);
				token = response.access_token;
				console.log(token);
			}).error(function (jqXHR, textStatus, errorThrown) 
			{
				console.log(jqXHR.responseText || textStatus);
			});
			
			console.log(token);
			return token;
	};

	var getPhoneInformation = function(cpf) 
	{
			var settings = 
			{
			  method: "GET",
			  "url": "https://direcional.telecomwm.com.br/api/pt-br/Telecom/Aparelho/" +cpf,
			  "headers": 
			  {
				"authorization": "bearer " + getTokenTWM()
			  }
			};

			$.ajax(settings).done(function (response) 
			{
				return response;
			}).error(function (jqXHR, textStatus, errorThrown) {
				console.log(jqXHR.responseText || textStatus);
			});
	};
	
	var dynamicallyLoadScript = function(url) 
	{
		var script = document.createElement("script"); 
		script.src = url; 
		document.head.appendChild(script); 
	};
	
	var getLogin = function()
	{ 
		return window.parent.WCMAPI.userLogin; 
	}
	
	var getUserCode = function()
	{ 
		return window.parent.WCMAPI.userCode 
	}
	
	var getCodProcess = function()
	{ 
		return window.parent.ecm_wkfview.processId == '' ? window.parent.ECM.workflowView.processId : window.parent.ecm_wkfview.processId;
	}

	var getCurrentState = function()
	{ 
		if(window.parent.ecm_wkfview.currentStates == null)
		{
		 return 0;
		}
		
		var currentMovto = window.parent.ecm_wkfview.currentMovto;

		var atv = window.parent.ecm_wkfview.currentStates.find(function(state)
		{
			return state.movementSequence == currentMovto;
		});

		if (atv != null)
		{
			return atv.stateSequence;
		}			
		
		return 0;
	}
	
	var GetDateNow = function() {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; 

		var yyyy = today.getFullYear();
		if (dd < 10) {
			dd = '0' + dd;
		}
		if (mm < 10) {
			mm = '0' + mm;
		}
		var today = dd + '/' + mm + '/' + yyyy;
		return today;
	}

	var WarningToast = function(texto, titulo, tipo) {
		FLUIGC.toast({
			title: titulo,
			message: texto,
			type: tipo,
			timeout: 3000
		});
	}

	var WarningAlert = function(texto, titulo, textoBotao) {
		FLUIGC.message.alert({
			message: texto,
			title: titulo,
			label: textoBotao
		}, function(el, ev) {});
	}

	var ConvertDate = function(data) {
		if (!data) {
			return data;
		}
		var dt = data.slice(0, 10).split('-');
		return dt[2] + '/' + dt[1] + '/' + dt[0];
	}

	var CheckField = function(field, checked) {
		$('#' + field).prop('checked', checked);
	}

	var DisabledField = function(field, disabled) {
		$('#' + field).attr("readonly", disabled);
	}

	var ChangeColorFieldConfirmed = function(field, confirmed) 
	{
		if (confirmed) 
		{
			$('#' + field).css('border-color', 'green');
		} 
		else 
		{
			$('#' + field).css('border-color', '');
		}
	}

	var ChangeColorFieldWrong = function(field, confirmed) 
	{
		if (confirmed) 
		{
			$('#' + field).css('border-color', 'red');
		} 
		else 
		{
			$('#' + field).css('border-color', '');
		}
	}

	return {
		destacaAprovacoes: destacaAprovacoes,
		destacaParecer: destacaParecer,
		camposObrigatorio: camposObrigatorio,
		validaCamposObrigatorio: validaCamposObrigatorio,
		carregaDescricaoProcesso: carregaDescricaoProcesso,
		expandePainel: expandePainel,
		getCodigoManual: getCodigoManual,
		carregaManual: carregaManual,
		loadingLayer: loadingLayer,
		PrintFormOpen: PrintFormOpen,
		getParameterUrlByName: getParameterUrlByName,
		refreshNumProcessWrong: refreshNumProcessWrong,
		getTokenTWM: getTokenTWM,
		getPhoneInformation: getPhoneInformation,
		destacaAprovacoesCheckBox: destacaAprovacoesCheckBox,
		mostrarReabertura: mostrarReabertura,
		searchCustomDataset: searchCustomDataset,
		searchFluigDataset: searchFluigDataset,
		defaultGetDataSet: defaultGetDataSet,
		setCacheDataSet: setCacheDataSet,
		getCacheDataSet: getCacheDataSet,
		dynamicallyLoadScript: dynamicallyLoadScript,
		getLogin: getLogin,
		getUserCode: getUserCode,
		getCodProcess: getCodProcess,
		getCurrentState: getCurrentState,
		WarningToast: WarningToast,
		WarningAlert: WarningAlert,
		ConvertDate: ConvertDate,
		CheckField: CheckField,
		DisabledField: DisabledField,
		ChangeColorFieldConfirmed: ChangeColorFieldConfirmed,
		ChangeColorFieldWrong: ChangeColorFieldWrong,
		GetDateNow: GetDateNow
	};

})();



