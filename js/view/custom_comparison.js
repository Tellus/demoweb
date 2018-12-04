(function(custom_comparison, $, undefined){
    function customComparisonUpdate() {
	if (customComparisonUpdate.loading == true) return;
	customComparisonUpdate.loading = true;

	ui.addLoading();

	var s_id = ui.getCurrentStretchId();

	var general_q = util.serializedArrayToObject($('#custom-comparison-general-form').serializeArray());
	var chart1_q = util.serializedArrayToObject($('#custom-comparison-chart1-form').serializeArray());
	var chart2_q = util.serializedArrayToObject($('#custom-comparison-chart2-form').serializeArray());

	// Apply general to the specifics.
	$.extend(chart1_q, general_q);
	$.extend(chart2_q, general_q);

	// Retrieve averages for both data sources.
	
	// Util function. Place in global scope?
	function getSourceFn(source) {
	    switch (source) {
	    case 'gps': return db.getGpsAvg;
	    case 'bt': return db.getBtAvg;
	    default: throw 'Unknown source type passed: ' + source;
	    }
	}

	// First.
	getSourceFn(chart1_q['source'])(s_id, chart1_q, function(red_data) {
	    
	    getSourceFn(chart2_q['source'])(s_id, chart2_q, function(blue_data) {

		// We need to adjust the intervals of the "larger" granularity so it
		// doesn't compress into the first part of the chart.

		var red_gran = Number(chart1_q['granularity']);
		var blue_gran = Number(chart2_q['granularity']);

		var big_d, big_g, small_d, small_g;

		if (blue_gran > red_gran) {
		    big_d = blue_data;
		    big_g = blue_gran;
		    small_d = red_data;
		    small_g = red_gran;
		    big_d_color = 'blue';
		    small_d_color = 'red';
		} else {
		    big_d = red_data;
		    big_g = red_gran;
		    small_d = blue_data;
		    small_g = blue_gran;
		    big_d_color = 'red';
		    small_d_color = 'blue';
		}

		var factor = big_g/small_g;

		$.each(big_d, function(key, value) {
		    value['interval'] = Math.floor(value['interval']*factor);
		});

		var step = Math.min(red_gran, blue_gran);

		var intervals = util.intervalsFromGranularity(general_q['time_from'],
							      general_q['time_to'],
							      step);

		renderCustomChart('#custom-comparison-chart',
				  red_data, blue_data);

		// Calculate diffs.
		var diff_data = [];

		function findDiffValue(interval) {
		    for (var ind = big_d.length-1; ind >= 0; ind--) {
			if (big_d[ind]['interval']*factor <= interval) {
			    return big_d[ind]['average'];
			}
		    }
		}

		$.each(small_d, function(key, value) {
		    /* For each loop, find the matching big_d entry and
		       calculate the diff.
		       We match backwards, so given intervals 0, 3, 6, 9 on
		       big_d, we match a small_d interval at 5 to 3.
		    */

		    var interval = value['interval'];
		    var diff = value['average'] - findDiffValue(interval);

		    diff_data.push({
			interval: interval,
			min_from_midnight: value['min_from_midnight'],
			diff: diff
		    });
		});

		var fullavg = 0;
		$.each(small_d, function(key, value) {
		    fullavg += value['average'];
		});
		$.each(big_d, function(key, value) {
		    fullavg += value['average'];
		});
		fullavg /= (small_d.length + big_d.length);

		renderDiffChart('#custom-comparison-diff-chart',
				diff_data);

		$('#custom-comparison-diff-chart').
		    highcharts().
		    setTitle({
			text: 'Difference red/blue (avg: ' + fullavg + ' km/h)'
		    }, {
			text: 'Over the line = ' + small_d_color + ' is faster. Under the line = ' + big_d_color + ' is faster.'
		    });

		ui.removeLoading();

		customComparisonUpdate.loading = false;
	    });
	});
    }

    // Get max date ranges before anything else.
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

		  $('.custom-comparison-datepicker').datepicker(dp_options);
		  $('.custom-comparison-datepicker[name="datekey_start"]').datepicker('setDate', min_date);
		  $('.custom-comparison-datepicker[name="datekey_end"]').datepicker('setDate', max_date);

		  ui.rangeSlider('#custom-comparison-range-slider');

		  $('.custom-comparison-tod-preset-container a').each(function(key, value) {
		      var targetSliders = ['#custom-comparison-fromtime-slider',
					   '#custom-comparison-totime-slider'];
		      ui.presetButton(this,
				      ['from', 'to'],
				      targetSliders,
				      function() {
					  $.each(targetSliders, function(key, value) {
					      $(value).trigger('input');
					      customComparisonUpdate();
					  });
				      });
		  });

		  // Add click handlers for day selection.
		  $('.custom-comparison-weekday-preset-container a').each(function(key, value) {
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
			  customComparisonUpdate();
		      });
		  });

		  // Initial commit.
		  customComparisonUpdate();

		  // Force *all* input changes to force an update.
		  $('input').change(customComparisonUpdate);
		  $('select').change(customComparisonUpdate);

	      });
}(window.custom_comparison = {}, jQuery))
