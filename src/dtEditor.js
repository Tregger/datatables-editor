/*
 * Simple editor plugin for Datatables
 * Use with buttons and select plugins together.
 * https://github.com/m3rg/datatables-editor
 */
(function( factory ){
	if ( typeof define === 'function' && define.amd ) {
		// AMD
		define( ['jquery', 'datatables.net'], function ( $ ) {
			return factory( $, window, document );
		} );
	}
	else if ( typeof exports === 'object' ) {
		// CommonJS
		module.exports = function (root, $) {
			if ( ! root ) {
				root = window;
			}

			if ( ! $ || ! $.fn.dataTable ) {
				$ = require('datatables.net')(root, $).$;
			}

			return factory( $, root, root.document );
		};
	}
	else {
		// Browser
		factory( jQuery, window, document );
	}
}(function( $, window, document, undefined ) {
'use strict';
var DataTable = $.fn.dataTable;
var _instCounter = 0;

var dtEditor = function(dt, config) {
	if ( config === true ) {
		config = {};
	}
	dt._dtEditor = true;

	// For easy configuration of buttons an array can be given
	if ( $.isArray( config ) ) {
		config = { dtEditor: config };
	}

	this.c = $.extend( true, {}, dtEditor.defaults, config );

	// Don't want a deep copy for the buttons
	if ( config.dtEditor ) {
		this.c.dtEditor = config.dtEditor;
	}
	if(typeof this.c.labels == "undefined") {
		this.c.labels = {};
	}
	if(!this.c.labels.close) {
		this.c.labels.close = "Close";
	}
	if(!this.c.labels.save) {
		this.c.labels.save = "Save";
	}
	if(!this.c.labels.addFormTitle) {
		this.c.labels.addFormTitle = "Add";
	}
	if(!this.c.labels.editFormTitle) {
		this.c.labels.editFormTitle = "Edit";
	}
	if(!this.c.labels.deleteFormTitle) {
		this.c.labels.deleteFormTitle = "Delete";
	}
	if(!this.c.labels.deleteFormBody) {
		this.c.labels.deleteFormBody = "Delete selected item(s)?";
	}
	if(!this.c.labels.yes) {
		this.c.labels.yes = "Yes";
	}
	if(!this.c.labels.noItemSelected) {
		this.c.labels.noItemSelected = "Please select item(s).";
	}
    if(!this.c.labels.error) {
		this.c.labels.error = "Error!";
	}

	this.s = {
		dt: new DataTable.Api( dt ),
		buttons: [],
		subButtons: [],
		listenKeys: '',
		namespace: 'dtedit'+(_instCounter++)
	};
}

$.extend( dtEditor.prototype, {
	init: function() {
		var buttons = this.getButtons();
		var _this = this;
		for(var i in buttons) {
			var buttonIndex = buttons[i][0].idx;
			var editType = buttons[i][0].inst.s.buttons[buttonIndex].conf.editType;
			if(typeof editType == "undefined" || !editType || !(editType == 'add' || editType == 'edit' || editType == 'delete')) {
				continue;
			}
			buttons[i].action(function(e, dt, button, config){
				_this.editMethods[config.editType](e, dt, button, config, _this);
			});
		}
	},
	getButtons: function() {
		var settings = this.s.dt.settings();
		var buttons = settings.buttons();
		var buttonsAll = [];
		for(var i in buttons) {
			if(!buttons.hasOwnProperty(i) || typeof buttons[i].idx == "undefined") {
				continue;
			}
			buttonsAll.push(settings.buttons(buttons[i].idx));
		}
		return buttonsAll;
	},
	getEditableColumns: function() {
		var editableColumns = [];
		var columns = this.s.dt.settings()[0].aoColumns;
		for(var i in columns) {
			if(columns[i].editable) {
				editableColumns.push(columns[i]);
			}
		}
		return editableColumns;
	},
	editMethods: {
		add: function(e, dt, button, config, _this) {
			_this.formModal("add", _this.c.labels.addFormTitle);
		},
		edit: function(e, dt, button, config, _this) {
			_this.formModal("edit", _this.c.labels.editFormTitle);
		},
		delete: function(e, dt, button, config, _this) {
			_this.deleteModal(_this.c.labels.deleteFormTitle);
		}
	},
	formModal: function(mode, formTitle) {
		var _this = this;
		var row;
		var colData;
		if("edit" == mode) {
			row = this.s.dt.row({selected: true}).data();
			if(typeof row == "undefined" || !row) {
				this.getModal("", this.c.labels.noItemSelected, '<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
				return;
			}
		}
		var columns = this.getEditableColumns();
		var html = "";
		for(var i in columns) {
			if("edit" == mode) {
				colData = row[columns[i].data];
				if(!colData) {
					colData = "";
				}
			}
			html += '<div class="form-group"><div class="row"><label class="control-label">' + columns[i].sTitle + '</label></div>';
			html += '<div>';
			if(columns[i].editType && columns[i].editType == "select") {
                var options = [];
                if(columns[i].options) {
                    for(var j in columns[i].options) {
                        options.push('<option value="' + j + '"' + (("edit" == mode && columns[i].options[j] == colData) || (typeof columns[i].selected != "undefined" && columns[i].selected == j)?' selected="selected"':'') + '>' + columns[i].options[j] + '</option>');
                    }
                }
				html += '<select id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control">' + (options.length?options.join(""):"") + '</select>';
			} else if(columns[i].editType && columns[i].editType == "file") {
                html += '<input type="file" id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control"' + (typeof columns[i].multiple !="undefined" && columns[i].multiple?' multiple="multiple"':"") + ' />';
                if("edit" == mode) {
                    html += '<span>' + colData + '</span>';
                }
            } else if(columns[i].editType && columns[i].editType == "textarea") {
                html += '<textarea id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control">' + ("edit" == mode?colData:'') + '</textarea>';
            } else {
				html += '<input id="' + columns[i].data + '" name="' + columns[i].data + '" type="text" class="form-control"' + ("edit" == mode?'value="' + colData + '"':'') + ' />';
			}
			html += '</div>';
			
			html += '<div>';
		}
		var modal = this.getModal(formTitle, html);
		var modalObj = $(modal);
		
		if("add" == mode && this.c.afterAddFormShow) {
			this.c.afterAddFormShow();
		} else if("edit" == mode && this.c.afterEditFormShow) {
			this.c.afterEditFormShow(row);
		}
		modalObj.find("button[type='submit']").on("click", function(){
			var data = {};
			if(typeof _this.c.postData != "undefined" && _this.c.postData) {
				data = _this.c.postData;
			}
            var formData = null;
			for(var i in columns) {
                if("file" == columns[i].editType) {
                    if(!formData) {
                        formData = new FormData();
                    }
                    var files = $("#" + columns[i].data)[0].files;
                    var colName = columns[i].data + (typeof columns[i].multiple != "undefined" && columns[i].multiple?"[]":"");
                    for(var j in files) {
                        if(!files.hasOwnProperty(j)) {
                            continue;
                        }
                        formData.append(colName, files[j]);
                    }
                    continue;
                }
				var value = $("#" + columns[i].data).val();
				if(value === null) {
					value = "";
				}
				data[columns[i].data] = value;
			}
            var ajaxConf = {
				url: (mode=="add"?_this.c.addUrl:_this.c.editUrl),
				method: "POST",
				data: (formData?formData:data),
                dataType: "json",
                error: function(data) {
                    _this.errorMethod(data)
                }
			};
            if(formData) {
                for(var i in data) {
                    formData.append(i, data[i]);
                }
                if("edit" == mode) {
                    formData.append("id", row.id);
                }
                ajaxConf.cache = false;
                ajaxConf.contentType = false;
                ajaxConf.processData = false;
            } else if("edit" == mode) {
				data.id = row.id;
			}
			$.ajax(ajaxConf).done(function(json){
				_this.s.dt.ajax.reload();
				modalObj.modal('hide');
			});
		});
	},
    errorMethod: function(data){
        try {
            var obj = JSON.parse(data.responseText);
            var html = [];
            for(var i in obj) {
                html.push(obj[i]);
            }
            this.getModal(this.c.labels.error, html.join("<br/>"), '<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
        } catch(err) {
            this.getModal(this.c.labels.error, data.responseText, '<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
        }
    },
	deleteModal: function(formTitle) {
		var _this = this;
		var rows = this.s.dt.rows({selected: true}).data();
		var rowIds = [];
		for(var i=0;i<rows.length;i++) {
			rowIds.push(rows[i].id);
		}
		if(rowIds.length <= 0 ) {
			this.getModal("", this.c.labels.noItemSelected, '<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
			return;
		}
		var modal = this.getModal(formTitle, this.c.labels.deleteFormBody, '<button type="submit" class="btn btn-success">' + this.c.labels.yes + '</button>'+
			'<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
		var modalObj = $(modal);
		
		modalObj.find("button[type='submit']").on("click", function(){
			var data = {};
			if(typeof _this.c.postData != "undefined" && _this.c.postData) {
				data = _this.c.postData;
			}
			data.id = rowIds;
			$.ajax({
				url: _this.c.deleteUrl,
				method: "POST",
				data: data,
                error: function(data) {
                    _this.errorMethod(data)
                }
			}).done(function(){
				_this.s.dt.ajax.reload();
				modalObj.modal('hide');
			});
		});
	},
	getModal: function(title, body, button) {
		var modalContainer = document.createElement("DIV");
		modalContainer.setAttribute("class", "modal");
		modalContainer.setAttribute("role", "dialog");
		modalContainer.innerHTML = '<div class="modal-dialog" role="document">'+
		'<div class="modal-content">'+
		  '<div class="modal-header">'+
			'<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
			'<h4 class="modal-title" id="myModalLabel">' + title + '</h4>'+
		  '</div>'+
		  '<div class="modal-body">'+ body +
		  '</div>'+
		  '<div class="modal-footer">'+
			(typeof button != "undefined" && button?button:'<button type="submit" class="btn btn-success">' + this.c.labels.save + '</button>'+
			'<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>')+
		  '</div>'+
		'</div>'+
	  '</div>';
		$("body").append(modalContainer);
		var modalObj = $(modalContainer);
		modalObj.modal();
		modalObj.on("hide.bs.modal", function(){
			$(this).remove();
		});
		return modalContainer;
	}
});

$.fn.dataTable.dtEditor = dtEditor;
$.fn.DataTable.dtEditor = dtEditor;

$(document).on( 'init.dt plugin-init.dt', function (e, settings, json) {
	if ( e.namespace !== 'dt' ) {
		return;
	}
	var opts = settings.oInit.dtEditor || DataTable.defaults.dtEditor;
	
	if ( opts && !settings._dtEditor) {
		new dtEditor( settings, opts ).init();
	}
} );;

return dtEditor;
}));