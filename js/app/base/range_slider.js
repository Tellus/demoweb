'use strict';

/*
  Double range slider support.
*/

/* Initialize a new range slider on a given element. Element is either a string
   selector for the element or an element from a jQuery selection. "#my-element"
   and $("#my-element") are equally viable.*/
function rangeSlider(element, triggerCb) {
    /* Updates the element pointed to by the slider to show new value. */
    function onSliderInput() {
	var sibling = $(this).siblings('input').first();
	var me = $(this);
	var my_rel = me.data('slider-rel');

	var my_val = Number(me.val());
	var sib_val = Number(sibling.val());
	var step = Number(me.attr('step'));

	if (my_rel == 'max' &&
	    my_val < sib_val) {
	    // My value is too low. Freeze at one step higher.
	    me.val(Math.min(sib_val + step, 1440));
	} else if (my_rel == 'min' &&
		   my_val > sib_val) {
	    // My value is too high. Freeze at one step lower.
	    me.val(Math.max(sib_val - step, 0));
	}

	var target = $(this).data('display');
	$(target).text(util.minuteToTime($(this).val()));

	if (triggerCb) {
	    if (my_rel == 'max') triggerCb(sib_val, my_val);
	    else triggerCb(my_val, sib_val);
	}
    }

    var el = typeof(element) == 'string' ? $(element) : element;

    el.find('input').each(function(i, v){
	$(v).on('input', onSliderInput);
	$(v).trigger('input');
    });
};
