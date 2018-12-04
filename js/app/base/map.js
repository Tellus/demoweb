'use strict';

/*
  Various map handling functions and basic map loading.

  For reference, contains elements of the older map.js and mycode.js files.
*/

var map = null;

$(() => {
    // OpenStreetMap support.
    // Ove suggests something along these lines (from their Google Maps apps):
    // "http://"+String.fromCharCode(97+((coord.x+coord.y)%3))+".tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png"
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 20, attribution: '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>'});

    var osmFrUrl='http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
    var osmFr = new L.TileLayer(osmFrUrl, {minZoom: 8, maxZoom: 20, attribution: 'donn&eacute;es &copy; <a href="//osm.org/copyright">OpenStreetMap</a>/ODbL - rendu <a href="//openstreetmap.fr">OSM France</a>'});

    
    // set up the map
    // [56.171074228546786, 10.175743103027344]
    // Check the pagestate to see if it contains center information. Then use them.
    var initcenter;
    var initzoom
    if (pagestate.hasQuery('centerlat') && pagestate.hasQuery('centerlng')) {
        var qs = pagestate.query(true);
        
        var l = { lat: qs.centerlat, lng: qs.centerlng };
        var l2 = { lat: Number(qs.centerlat), lng: Number(qs.centerlng) };
        
        // console.debug('latlng in query string. Setting.', l, l2);

	initcenter = L.latLng(Number(qs.centerlat), Number(qs.centerlng));
    }

    if (pagestate.hasQuery('mapzoom') && Number(qs.mapzoom)) {
        var qs = pagestate.query(true);
        
        // console.debug('Zoom in query string. Setting.');
	initzoom = qs.mapzoom;
    }
    
    map = new L.Map('map', {
	center: initcenter || L.latLng(57.046052750882986, 9.924430847167969),
        zoom: initzoom || 12,
        zoomControl: false, // We place the zoomControl later.
        layers: [ osm, osmFr ]
    });

    // Set default layer.
    //map.addLayer(osm);
    L.control.layers({ 'OpenStreetMap': osm, 'OpenStreetMap.fr': osmFr }, null, { position: 'bottomright' }).addTo(map);

    // Add zoom buttons for people without scroll wheels. We add our own to
    // position it in the lower right, out of sight.
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    // Add Daisy image on load.
    var DaisyImageControl = L.Control.extend({
	options: {
	    position: 'bottomleft'
	},

	onAdd: function (map) {
	    // create the control container with a particular class name
	    // ** you can add the image to the div as a background image using css
	    
	    var container = L.DomUtil.create('div', 'daisy-image-control');

	    // ... initialize other DOM elements, add listeners, etc.
	    return container;
	}
    });

    map.addControl(new DaisyImageControl());

    // Attempting to hack in a link on an image control.
    $('.daisy-image-control').wrap('<a href="http://www.daisy.aau.dk/" target="_blank"></a>');

    // pagestate.js hooks. Update the URI every time the map is moved/zoomed.
    function map_move_state_fn() {
        var l = map.getCenter();
        pagestate.setQuery('centerlat', l.lat)
                 .setQuery('centerlng', l.lng);
    }

    function map_zoom_state_fn() {
        pagestate.setQuery('mapzoom', map.getZoom());
    }
    
    map.on('moveend', map_move_state_fn);
    map.on('zoomend', map_zoom_state_fn);
});
