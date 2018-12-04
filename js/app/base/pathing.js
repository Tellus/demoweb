'use strict';

/*
	Asynchronous routing functions with line substring construction.
*/

(function(pathing, $, undefined) {

		function getPath (fromPoint, toPoint, cb, err) {
				/* Uses the database to calculate the path between the two latlng pairs.
					 Constructs substrings of the starting and ending segments to generate
					 a perfect path.
				*/

				// Since we acn't gauge start/end points in a vacuum, we simply
				// use two and fix later.
				$.getJSON('/query/shortest_path_geojson', {
						fromlongitude: fromPoint.lng,
						fromlatitude: fromPoint.lat,
						tolongitude: toPoint.lng,
						tolatitude: toPoint.lat,
				}, (data) => {
						cb(data);
				}).fail((jgxhr, textStatus, error) => {
						if (err) err(jgxhr, textStatus, error);
						else console.error('No error handler attached. Error: ' + jgxhr.responseText);
				});
		}
		pathing.getPath = getPath;

		// Gets the segment closest to a given point. Correctness of point is up to
		// the caller.
		function getSegment(key, cb) {
				$.getJSON('/query/segment', {
						segmentkey: key
				}, cb);
		}
		pathing.getSegment = getSegment;

		// Gets the segment closest to a given point. Correctness of point is up to
		// the caller.
		function getClosestSegment(point, cb) {
				$.getJSON('/query/closest_segment', {
						latitude: point.lat,
						longitude: point.lng,
						threshold: 1000
				}, cb);
		}
		pathing.getClosestSegment = getClosestSegment;
		
}(window.pathing = window.pathing || {}, jQuery));
