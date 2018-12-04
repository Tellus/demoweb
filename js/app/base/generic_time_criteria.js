'use strict';

/*
  Code for the generic time criteria sidebar, used in both ITSPx1 and ITSPx2.
*/

// POSSIBLE CODE LEAK! WE NEED REFERENCES TO THE PIKADAY INSTANCES!
var fromDate = null;
var toDate = null;

(function(timeCriteria, $, undefined) {
    timeCriteria.from_datekey = null;
    timeCriteria.to_datekey = null;
    timeCriteria.from_timekey = 0;
    timeCriteria.to_timekey = 1440;
}(window.timeCriteria = window.timeCriteria || {}, jQuery));

function onTimekeyUpdated() {
    timeCriteria.from_timekey = $('#fromtime-slider').val();
    timeCriteria.to_timekey = $('#totime-slider').val();
}

function serializeTimeCriteria(element) {
    element = $(element);

    if (element.length < 1) console.err('Element ' + element + ' not found!');

    var params = {};

    params.fromTimekey = util.minutesToTimekey(element.find('#fromtime-slider').val());
    params.toTimekey = util.minutesToTimekey(element.find('#totime-slider').val())

    // Zero-indexing starts with Monday. This is to fit Ove's temporal criteria function.
    params.weekdays = [];
    element.find('.weekday-toggle').each((key, val) => {
        var tmp = $(val);
        if (tmp.prop('checked')) params.weekdays[key] = 1;
        else params.weekdays[key] = 0
    });
    params.weekdays = params.weekdays.join('')

    params.months = [];
    element.find('.month-toggle').each((key, val) => {
        var tmp = $(val);
        if (tmp.prop('checked')) params.months[key] = 1;
        else params.months[key] = 0;
    });
    params.months = params.months.join('');
    
    var fromDateVal = fromDate.toString('YYYYMMDD');
    if (fromDateVal) params.fromDatekey = fromDateVal;

    var toDateVal = toDate.toString('YYYYMMDD');
    if (toDateVal) params.toDatekey = toDateVal;

    return params;
}

$(() => {
    // Base element, keeps us from accidentally modifying other elements.
    var base = $('#time-sidebar');

    // Set up the time of day range slider.
    rangeSlider(base.find('#range-slider'), onTimekeyUpdated);
    // Preset buttons
    base.find('#tod-presets').find('a').each((i, el) => {
	$(el).click((ev) => {            
	    var th = $(ev.target);

            var froms = base.find('input#fromtime-slider');
            var tos = base.find('input#totime-slider');

            froms.val(th.data('from'));
            tos.val(th.data('to'));

            froms.trigger('input');
            tos.trigger('input');
            
	    onTimekeyUpdated();
	});
    });

    // Weekdays - presets.
    base.find('.weekday-preset').each((i, el) => {
	$(el).click((ev) => {
	    var th = $(ev.target);

	    var days = th.data('days').split(',');

	    $('#weekdays').find('input').prop('checked', false).removeClass('checked');
	    $('#weekdays').find('label').removeClass('active');

	    $.each(days, (key, day) => {
		var t = $('#weekday-' + day);
		t.prop('checked', true).addClass('checked');
		t.parent('label').addClass('active');
	    });
	});
    });

    // Month presets.
    base.find('.month-preset').each((i, el) => {
	$(el).click((ev) => {
	    var th = $(ev.target);

	    var months = th.data('months').split(',');

	    $('#months').find('input').prop('checked', false).removeClass('checked');
	    $('#months').find('label').removeClass('active');

	    $.each(months, (key, month) => {
		var t = $('#month-' + month);
		t.prop('checked', true).addClass('checked');
		t.parent('label').addClass('active');
	    });
	});
    });

    
    // Set up the datepickers.
    var dp_options = {
	format: "yyyy/mm/dd",
	weekStart: 1,
	calendarWeeks: true,
	autoclose: true,
	todayHighlight: true,
	clearBtn: true
    };

    dp_options = {
        format: 'DD/MM/YYYY',
        firstDay: 1,
        showWeekNumber: true,
        onSelect: (data) => {
            console.debug("Date selected: ", data);
        },
        setDefaultDate: true
    };
    
    fromDate = new Pikaday($.extend(dp_options, {
        field: $('#fromdate')[0],
        onSelect: (newDate) => {
            toDate.setMinDate(newDate);
            toDate.setStartRange(newDate);
        },
        defaultDate: moment('2016-02-01').toDate()
    }));
    toDate = new Pikaday($.extend(dp_options, {
        field: $('#todate')[0],
        onSelect: (newDate) => {
            fromDate.setMaxDate(newDate);
            fromDate.setEndRange(newDate);
        },
        defaultDate: new Date
    }));
});
