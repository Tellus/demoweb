/**
 * Miscellaneous utility functions.
 **/

(function(util, $, undefined){

    function supportedStepping(v) {
	return [5, 10, 15, 30, 60].indexOf(Number(v)) >= 0;
    }

    /**
     * Basic, vanilla, error handling function for jQuery AJAX requests. This is
     * mostly so we can quickly add a failure callback to our requests that will
     * just dump the data. Less redundancy
     **/
    util.stdErrFn = function(jgXHR, textStatus, error, cb) {
	var err = textStatus + " " + error;
	console.debug("Failed request: " + err);
	console.debug(jgXHR);

	if (cb) cb(jgXHR, textStatus, error);
    }

    /**
     * Converts minutes from midnight to a human-readable time format.
     **/
    util.minuteToTime = function(value) {
	var minutes = value % 60;
	var hours = Math.floor(value/60);
	var minute_str = minutes < 10 ? '0'+minutes : minutes;
	return hours + ":" + minute_str;
    }

    /**
     * Returns an array of interval values matching the from and to times.
     * If stepping=15 then this function is equivalent to the old
     * quartersFromMinuteInterval function.
     **/
    util.intervalsFromGranularity = function(from, to, step) {
	from = Number(from);
	to = Number(to);

	if (from > to)
	    throw 'FromTime must be smaller than ToTime!';
	if (to > 1440)
	    throw 'ToTime must be 1440 at most';
	if (from < 0)
	    throw 'FromTime must be positive.';
	if (!supportedStepping(step)) {
	    throw 'intervalsFromGranularity: Unsupported stepping: ' + String(step);
	}

	var target_count = (to-from)/step;
	var first = Math.floor(from/step);
	
	var ret = [];

	for (var i = 0; i < target_count; i++) {
	    ret.push(i + first);
	}

	// TODO: Better ways to handle this special case?
	// If to is NOT 1440, add a final step.
	if (to < 1440) ret.push(i + first);

	return ret;	
    }
    
    /**
     * Converts min_from_midnight values to their string equivalents. This was
     * introduced as intervals by themselves do not contain information about 
     * granularity. min_from_midnight is nice and absolute.
     **/
    util.mfmToStr = function(input) {
	if ($.isArray(input)) {
	    // Handle array case by calling each entry as singles.
	    var out = [];
	    $.each(input, function(key, value) {
		out.push(util.mfmToStr(value));
	    });
	    return out;
	} else {
	    // Handles single case.
	    var hour = Math.floor(input/60);
	    var minute = input % 60;

	    var hour_str = hour == 0 ? '00' : String(hour);
	    var min_str;
	    if (minute == 0) min_str = '00';
	    else if (minute < 10) min_str = '0' + String(minute);
	    else min_str = String(minute);

	    return hour_str + ':' + min_str;
	}
    }

    util.intervalToStr = function(input, step) {
	if (!supportedStepping(step)) {
	    throw 'intervalToStr: Unsupported stepping: ' + String(step);
	}

	if ($.isArray(input)) {
	    var out = [];
	    $.each(input, function(key, value) {
		out.push(util.intervalToStr(value, step));
	    });
	    return out;
	} else {
	    var step_factor = 60 / step;

	    var hour = Math.floor(input / step_factor);
	    var minute = (input % step_factor) * step;
	    
	    var hour_str = hour == 0 ? '00' : String(hour);
	    var min_str;
	    if (minute == 0) min_str = '00';
	    else if (minute < 10) min_str = '0' + String(minute);
	    else min_str = String(minute);

	    return hour_str + ':' + min_str;
	}
    }

    /**
     * Converts a serialized array (as created by $.serializeArray) into a plain
     * object that might be a bit more fun to work with.
     **/
    util.serializedArrayToObject = function(arr) {
	var retval = {};
	$.each(arr, function(i, v) {
	    if (retval.hasOwnProperty(v.name)) {
		if ($.isArray(retval[v.name])) {
		    // Push.
		    retval[v.name].push(v.value);
		} else {
		    // Convert.
		    retval[v.name] = Array(retval[v.name], v.value);
		}
	    } else {
		retval[v.name] = v.value;
	    }
	});
	return retval;
    }

    /**
     * Pads an array so it contains a full series of keys.
     * src - the source array.
     * keyfn - function to calculate the next key. Takes an int, returns an object.
     *         return null when end of series has been reached.
     * padValue - the value to insert. Either a function (take key, return object) or
     * an object.
     **/
    util.padArray = function(src, keyfn, padValue) {
	var i = 0;
	var key = keyfn(i);
	while (keyfn != null) {
	    if (src[key]) continue;
	    else src[key] = typeof(padValue) == typeof(util.padArray) ? padValue(key) : padValue;
	}
	return src;
    }

    /**
     * Merges two arrays using a function fn. The arrays must have the same length.
     * fn must take two values (of matching index in arr1 and arr2) and return the
     * new value.
     **/
    util.mergeArrays = function(arr1, arr2, fn) {
	if (arr1.length != arr2.length)
	    throw "Input arrays must have same length."
	var retVal = [];

	for (var i = 0; i < arr1.length; i++)
	    retVal.push(fn(arr1[i], arr2[i]));

	return retVal;
    }

    /**
     * Dumps the arguments passed to it into the console.
     **/
    util.dump = function() {
	console.debug('Dumping ' + arguments.length + ' parameters.');
	$.each(arguments, function(key, value) {
	    console.debug(value);
	});
	console.debug('------------');
    }

    /* Generate quarters for all quarters of the day.
     * TODO: Generalize to allow smaller intervals.
     */
    util.generateQuartersStr = function() {
	var ret = [];

	for (var i = 0; i < 96; i++) {
	    ret.push(String(Math.floor(i/4)) + ":" + String((i % 4)*15));
	}

	return ret;
    }

    /**
     * Converts an ITSP datekey smartkey to a Javascript date.
     **/
    util.dateFromKey = function(datekey) {
	var dstr = String(datekey);
	var year = dstr.slice(0, 4);
	var month = dstr.slice(4, 6);
	var day = dstr.slice(6, 8);

	return new Date(year + " " + month + " " + day);
    }

    /**
     * Converts a minute count (0 to 1440) to an ITSP timekey.
     * For example, 1092 turns to 1812 (twelve past six in the evening).
     **/
    util.minutesToTimekey = function(minutes) {
        return (Math.floor(minutes/60)*100)+(minutes % 60);
    }
    
    /**
     * Calculates the angle from point a to point b from the x-axis.
     **/
    util.angleToPoint = function(pa, pb) {
	// Transpose to origin.
	var px = {
	    lat: pa.lat-pb.lat,
	    lng: pa.lng-pb.lng
	};

	var radAngle = Math.atan2(px.lat, px.lng);
	var degAngle = radAngle * 180/Math.PI;

	return degAngle;
    }

    /**
     * Returns a string representing the compass direction of the pass angle.
     * -90 -> N
     * 90 -> S
     * -180 -> E
     * 0 -> W
     **/
    util.angleToCompass = function(angle) {
	var snap = angle/180;
	// 0=W, 1/-1=E, 0.5=S, -0.5=N
	var dirs = {
	    '0': 'W',
	    '45': 'SW',
	    '90': 'S',
	    '135': 'SE',
	    '180': 'E',
	    '-180': 'E',
	    '-135': 'NE',
	    '-90': 'N',
	    '-45': 'NW'
	};

	var min = 0;
	$.each(dirs, (ang, dir) => {
	    if (Math.abs(angle-ang) < Math.abs(angle-min)) min = ang;
	});

	return dirs[min];
    }
    
}(window.util = window.util || {}, jQuery));
