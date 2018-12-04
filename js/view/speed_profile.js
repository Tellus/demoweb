(function(speed_profile, $, undefined){
    function updateSpeedProfile() {
				if (updateSpeedProfile.loading == true) return;
				updateSpeedProfile.loading = true;

				ui.addLoading();

				var s_id = ui.getCurrentStretchId();

				var qstr = util.serializedArrayToObject($('#speed-profile-filter-form').serializeArray());

				console.debug("Getting (NEW) boxplot.");
				db.getBoxplot(s_id, qstr, function(boxplotdata) {
						console.debug("Got boxplot:");
						util.dump(boxplotdata);
						var fromTime = $('#speed-profile-fromtime-slider').val();
						var toTime = $('#speed-profile-totime-slider').val();
						var step = qstr['granularity'];
						var intervals = util.intervalsFromGranularity(fromTime, toTime, step);
						renderBoxplotChart('#speed-profile-chart', boxplotdata);

						db.getComparison(s_id, qstr, function(compdata) {
	    					renderDiffChart('#speed-profile-diff-chart', compdata, intervals, step);

								// Remove loading overlay.
								ui.removeLoading();
								updateSpeedProfile.loading = false;
						});
				});
    }

    // Enable date picker.
    // Get max date ranges, then enable it.
    // The entire view actually hinges on this data, so we wrap it around the rest.
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

									$('#speed-profile-fromdate').datepicker(dp_options);
									$('#speed-profile-fromdate').datepicker('setDate', min_date);

									$('#speed-profile-todate').datepicker(dp_options);
									$('#speed-profile-todate').datepicker('setDate', max_date);

									ui.rangeSlider('#speed-profile-range-slider');

									// Change slider stepping when granularity changes.
									$('#speed-profile-interval-select').change(function(ev) {
											var step = Number($(this).val());
											$('#speed-profile-range-slider input').each(function(key, val){
													var val = Number($(this).val())
													$(this).attr('step', step);
													// TODO: Make a better snap.
													// snap to first lower legal value.
													while (val > 0 && (val % step) != 0)
															val--;

													$(this).val(val);

													$(this).trigger('input');
											});	
									});

									$('#speed-profile-tod-presets .speed-profile-tod-preset').each(function(key, value) {
											var targetSliders = ['#speed-profile-fromtime-slider',
																					 '#speed-profile-totime-slider'];
											ui.presetButton(this,
																			['from', 'to'],
																			targetSliders,
																			function() {
																					$.each(targetSliders, function(key, value) {
																							$(value).trigger('input');
																							updateSpeedProfile();
																					});
																			});
									});


									// Add click handlers for day selection.
									$('.speed-profile-weekday-preset').each(function(key, value) {
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
													updateSpeedProfile();
											});
									});

									// Initial update.
									updateSpeedProfile();
									
									// Force *all* input changes to force an update.
									$('input').change(updateSpeedProfile);
									$('select').change(updateSpeedProfile);
							});
}(window.speed_profile = {}, jQuery))
