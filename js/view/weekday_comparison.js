(function(weekday_comparison, $, undefined){
    function weekdayComparisonUpdate() {
	if (weekdayComparisonUpdate.loading == true) return;
	weekdayComparisonUpdate.loading = true;

	ui.addLoading();

	var s_id = ui.getCurrentStretchId();

	var qstr = util.serializedArrayToObject($('#weekday-comparison-filter-form').serializeArray());

	db.getGpsAvg(s_id, qstr, function(gpsavgdata) {

	    // Overwrite the weekdays array.
	    qstr['weekday'] = ['monday',
			       'tuesday',
			       'wednesday',
			       'thursday',
			       'friday',
			       'saturday',
			       'sunday'];

	    db.getBtWeekdays(s_id, qstr, function(wkdata) {
		renderWeekdayChart('#weekday-comparison-chart', wkdata, gpsavgdata);
		renderWeekdayCountChart('#weekday-comparison-count-chart', wkdata, gpsavgdata);

		ui.removeLoading();
		weekdayComparisonUpdate.loading = false;
	    });
	});
    }

    // Enable date picker.
    // Get max date ranges, then enable it.
    $.getJSON('query/data_date_range',
	      { stretch: ui.getCurrentStretchId() },
	      function(date_keys) {

		  var min_date = util.dateFromKey(date_keys.min_datekey);
		  var max_date = util.dateFromKey(date_keys.max_datekey);

		  var dp_options = {
		      format: "yyyy/mm/dd",
		      weekStart: 1,
		      calendarWeeks: true,
		      autoclose: true,
		      todayHighlight: true,
		      clearBtn: true,
		      startDate: min_date,
		      endDate: max_date
		  };

		  $('#weekday-comparison-fromdate').datepicker(dp_options);
		  $('#weekday-comparison-fromdate').datepicker('setDate', min_date);

		  $('#weekday-comparison-todate').datepicker(dp_options);
		  $('#weekday-comparison-todate').datepicker('setDate', max_date);

		  ui.rangeSlider('#weekday-comparison-range-slider');

		  // Change slider stepping when granularity changes.
		  $('#weekday-comparison-interval-select').change(function(ev) {
		      console.debug('Changing stepping of sliders to ' + $(this).val());
		      var step = Number($(this).val());
		      $('#weekday-comparison-range-slider input').each(function(key, val){
			  var val = Number($(this).val())
			  console.debug('Step ' + $(this).attr('step') + " to " + step);
			  $(this).attr('step', step);
			  // TODO: Make a better snap.
			  // snap to first lower legal value.
			  while (val > 0 && (val % step) != 0)
			      val--;

			  $(this).val(val);

			  $(this).trigger('input');
		      });	
		  });

		  $('#weekday-comparison-tod-presets .weekday-comparison-tod-preset').each(function(key, value) {
		      var targetSliders = ['#weekday-comparison-fromtime-slider',
					   '#weekday-comparison-totime-slider'];
		      ui.presetButton(this,
				      ['from', 'to'],
				      targetSliders,
				      function() {
					  $.each(targetSliders, function(key, value) {
					      $(value).trigger('input');
					      weekdayComparisonUpdate();
					  });
				      });
		  });

		  // Add click handlers for day selection.
		  $('.weekday-comparison-weekday-preset').each(function(key, value) {
		      $(this).click(function(ev) {
			  var days = $(this).data('days').split(',');
			  var target = $(this).data('target');
			  $(target + ' input').each(function(key, value) {
			      $(value).prop('checked', false);
			      $(value).parent().removeClass('active');
			  });
			  $(target + ' input').each(function(key, value) {
			      if (days.indexOf($(value).val()) >= 0) {
				  $(value).prop('checked', true);
				  $(value).parent().addClass('active');
			      }
			  });
			  weekdayComparisonUpdate();
		      });
		  });

		  // Allow resetting the form.
		  $('#weekday-comparison-reset-button').click(function(){
		      // Reset times.
		      $('#weekday-comparison-fromtime-slider').val(0).change();
		      $('#weekday-comparison-totime-slider').val(1440).change();
		      // Reset date range.
		      $('#weekday-comparison-fromdate').val(null);
		      $('#weekday-comparison-todate').val(null);
		      // Reset weekdays.
		      $('#weekday-comparison-interval-select').val('15');
		  });

		  // Force *all* input changes to force an update.
		  $('input').change(weekdayComparisonUpdate);
		  $('select').change(weekdayComparisonUpdate);

		  // Initial update.
		  weekdayComparisonUpdate()
	      });
}(window.weekday_comparison = {}, jQuery))
