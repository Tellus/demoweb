/**
 * Various debugging functions, many tied to the debugging sidebar.
 **/

function debug_insertJson() {
    console.debug("Insert JSON code...");

    var type = $('#debug-json-type-selector').val();
    var content = $('#debug-json-input').val();

    console.debug("Type: " + type);
    console.debug("Content (raw): " + content);

    content = eval(content);

    if ($.isArray(content)){
	console.debug("Full array. Running through.");
	$.each(content, function(k, v){
	    debug_addJsonElement(v, type);
	});
    } else {
	console.debug("Single element. Adding.");
	debug_addJsonElement(content, type);
    }

    console.debug(content);
}

function debug_addJsonElement(element, type) {
    console.debug("Adding a " + type);
    console.debug(element);
    var toadd;
    if (type == 'geojson') {
	toadd = L.geoJson(element);
    } else if (type == 'latlonobj') {
	toadd = L.marker(element);
    }

    toadd.addTo(map);
}

$(function(){
    $('#debug-json-input-submit').click(debug_insertJson);
});
