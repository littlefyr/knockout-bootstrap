//Depends on modal.js
(function($) {
	ko.bootstrap.ConfirmModel = function(options) {
		var self = this;

		if (typeof options === 'undefined') {
			options = {};
		}

		options = $.extend({
			message: 'Do you want to do this?'
		}, options);

		$.extend(true, this, ko.bootstrap.ModalModel);
		
		var cancelButton = new ko.bootstrap.ModalButtonModel({
			clazz: 'btn btn-danger',
			name: 'Cancel'
		});

		var okButton = new ko.bootstrap.ModalButtonModel({
			clazz: 'btn btn-success',
			name: 'Ok',
			action: function() {
				options.success(self);
			}
		});

		self.body(options.message);
		
		self.buttonsData.push(cancelButton);
		self.buttonsData.push(okButton);
	};
	ko.bootstrap.ConfirmModel.prototype = new ko.bootstrap.ModalModel();
	ko.bootstrap.ConfirmModel.prototype.constructor = ko.bootstrap.ConfirmModel;

	te.addTemplate("kb_confirm", '\
	<div class="modal hide fade" data-bind="attr: {\'id\': id}">\
		<div class="modal-body" data-bind="html:body">\
		</div>\
		<div class="modal-footer" data-bind="foreach: buttons">\
			<!-- ko template: {\'name\': $parent.buttonTemplate} -->\
			<!-- /ko -->\
		</div>\
	</div>');

	ko.bindingHandlers.confirm = {
		init: function() {
			return ko.bindingHandlers.modal.init();
		},
		update: function(element, valueAccessor, allBindingsAccessor, vm, bindingContext) {
			var viewModel = valueAccessor(), allBindings = allBindingsAccessor();
			allBindings.headerTemplate = "kb_confirm";
			
			var ret = ko.bindingHandlers.modal.update(element, valueAccessor, allBindingsAccessor, vm, bindingContext);
			
			return ret;
		}
	};
}(jQuery));