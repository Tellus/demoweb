'use strict';

/*
  Simple modal support. Automatically added by the generic_modal template.
*/

(function(modal, $, undefined) {
		function show(title, body) {
				$('#generic-modal-title').text(title);
				$('#generic-modal-body').html(body);
				$('#generic-modal').modal('show');
		}
		modal.show = show;

		$('#generic-modal').modal({ show: false });
}(window.modal = window.modal || {}, jQuery));
