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
DataTable.dtEditor = {};
DataTable.dtEditor = function(dt, config) {
	if ( config === true ) {
		config = {};
	}
	dt._dtEditor = true;

	// For easy configuration of buttons an array can be given
	if ( $.isArray( config ) ) {
		config = { dtEditor: config };
	}

	this.c = $.extend( true, {}, DataTable.dtEditor.defaults, config );

	// Don't want a deep copy for the buttons
	if ( config && config.dtEditor ) {
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
    if(!this.c.labels.saving) {
		this.c.labels.saving = "Saving..";
	}

	this.s = {
		dt: new DataTable.Api( dt ),
		buttons: [],
		subButtons: [],
		listenKeys: '',
		namespace: 'dtedit'+(_instCounter++)
	};
}

$.extend( DataTable.dtEditor.prototype, {
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
	formModal: function(mode, formTitle, rowId) {
		var _this = this;
		var row;
		var colData;
		if("edit" == mode) {
            if(typeof rowId != "undefined" && rowId !== false) {
                row = this.s.dt.row("#" + rowId).data();
            } else {
                row = this.s.dt.row({selected: true}).data();
            }
			if(typeof row == "undefined" || !row) {
				this.getModal("", this.c.labels.noItemSelected, '<button type="button" class="btn btn-primary" data-dismiss="modal">' + this.c.labels.close + '</button>');
				return;
			}
		}
		var columns = this.getEditableColumns();
		var html = "";
        if(this.c.modalBodyTemplate) {
            html += this.c.modalBodyTemplate;
        }
		for(var i in columns) {
			if("edit" == mode) {
				colData = row[columns[i].data];
				if(!colData) {
					colData = "";
				}
			}
            var columnTitle = columns[i].sTitle;
            if(typeof this.c.modalBodyTemplate == "undefined" || !this.c.modalBodyTemplate) {
                html += '<div class="form-group"><div class="row">';

                if(typeof this.c.editLabelTag != undefined && this.c.editLabelTag) {
                    html += '<' + this.c.editLabelTag + '>' + columnTitle + '</' + this.c.editLabelTag + '>';
                } else {
                    html += '<label class="control-label">' + columnTitle + '</label>';
                }
                html += '</div><div>';
            } else {
                html = html.replace("{title-" + columns[i].data + "}", columnTitle);
            }
            var columnEl;
            var placeholder = (typeof columns[i].editOptions != "undefined" && typeof columns[i].editOptions.placeholder != "undefined"?columns[i].editOptions.placeholder:"");
			if(columns[i].editType && columns[i].editType == "select") {
                var options = [];
                if(columns[i].options) {
                    for(var j in columns[i].options) {
                        options.push('<option value="' + j + '"' + (("edit" == mode && columns[i].options[j] == colData) || (typeof columns[i].selected != "undefined" && columns[i].selected == j)?' selected="selected"':'') + '>' + columns[i].options[j] + '</option>');
                    }
                }
				columnEl = '<select id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control"' + (placeholder?' placeholder="' + placeholder + '"':'') + '>' + (options.length?options.join(""):"") + '</select>';
			} else if(columns[i].editType && columns[i].editType == "file") {
                columnEl = '<input type="file" id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control"' + (typeof columns[i].multiple !="undefined" && columns[i].multiple?' multiple="multiple"':"") + (placeholder?' placeholder="' + placeholder + '"':'') + ' />';
                if("edit" == mode) {
                    columnEl += '<span>' + colData + '</span>';
                }
            } else if(columns[i].editType && columns[i].editType == "textarea") {
                columnEl = '<textarea id="' + columns[i].data + '" name="' + columns[i].data + '" class="form-control"' + (placeholder?' placeholder="' + placeholder + '"':'') + '>' + ("edit" == mode?colData:'') + '</textarea>';
            } else if(columns[i].editType && columns[i].editType == "checkbox") {
				columnEl = '<input id="' + columns[i].data + '" name="' + columns[i].data + '" type="checkbox"' + ("edit" == mode && colData?' checked="checked"':'') + (placeholder?' placeholder="' + placeholder + '"':'') + ' />';
			} else {
				columnEl = '<input id="' + columns[i].data + '" name="' + columns[i].data + '" type="text" class="form-control"' + ("edit" == mode?'value="' + colData + '"':'') + (placeholder?' placeholder="' + placeholder + '"':'') + ' />';
			}
            if(typeof this.c.modalBodyTemplate == "undefined" || !this.c.modalBodyTemplate) {
                html += columnEl;
                html += '</div>';
                html += '<div>';
            } else {
                html = html.replace("{" + columns[i].data + "}", columnEl);
            }
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
            var buttonObj = $(this);
            var buttonObjValue = buttonObj.html();
            buttonObj.prop("disabled", true);
            buttonObj.html(_this.c.labels.saving);
			if(typeof _this.c.postData != "undefined" && _this.c.postData) {
				data = _this.c.postData;
			}
            var formData = null;
            $("[name]", modalObj).each(function(){
                var obj = $(this);
                if("file" == obj.attr("type")) {
                    if(!formData) {
                        formData = new FormData();
                    }
                    var files = obj[0].files;
                    var colName = obj.attr("name") + (obj.is("[multiple]")?"[]":"");
                    for(var j in files) {
                        if(!files.hasOwnProperty(j)) {
                            continue;
                        }
                        formData.append(colName, files[j]);
                    }
                    return;
                } else if("checkbox" == obj.attr("type")) {
                    data[obj.attr("name")] = obj.is(":checked")?obj.val():"";
                    return;
                }
                data[obj.attr("name")] = obj.val();
                
            });
            var ajaxConf = {
				url: (mode=="add"?_this.c.addUrl:_this.c.editUrl),
				method: "POST",
				data: (formData?formData:data),
                dataType: "json",
                error: function(data) {
                    buttonObj.html(buttonObjValue);
                    buttonObj.prop("disabled", false);
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
    /**
     * 
     * @param {String} formTitle
     * @param {Integer|Object} rowId
     */
	deleteModal: function(formTitle, rowId) {
		var _this = this;
		var rowIds = [];
        if(typeof rowId != "undefined" && rowId !== false) {
            if(typeof rowId == "object") {//if array
                rowIds = rowId;
            } else {
                rowIds.push(rowId);
            }
        } else {
            var rows = this.s.dt.rows({selected: true}).data();
            for(var i=0;i<rows.length;i++) {
                rowIds.push(rows[i].id);
            }
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

var apiRegister = DataTable.Api.register;
apiRegister( 'dtEditor()', function () {
	return this.iterator( 'table', function ( ctx ) {
        var api = new DataTable.Api( ctx );
        var settings = api.settings()[0]
        var opts = settings.oInit.dtEditor || DataTable.defaults.dtEditor;
		return new DataTable.dtEditor(settings, opts);
	} );
} );

$.fn.dataTable.dtEditor = DataTable.dtEditor;
$.fn.DataTable.dtEditor = DataTable.dtEditor;

$(document).on( 'init.dt plugin-init.dt', function (e, settings, json) {
	if ( e.namespace !== 'dt' ) {
		return;
	}
	var opts = settings.oInit.dtEditor || DataTable.defaults.dtEditor;
	
	if ( opts && !settings._dtEditor) {
		new DataTable.dtEditor( settings, opts ).init();
	}
} );;

return DataTable.dtEditor;
}));