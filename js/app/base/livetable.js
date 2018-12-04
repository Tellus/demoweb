'use strict';

/**
 * The LiveTable class manages a two-dimensional table of information,
 * continuously rendering changes to a HTML element. This should reduce a lot of
 * rendering overhead, while allowing for many async writes from multiple AJAX
 * requests. I'm considering a subclass specifically for OD matrices.
 * Important for use! We index in a "matrix" fashion, ROWxCOL not "X->Y"
 **/
class LiveTable {
    /**
     * Construct a new LiveTable of size rowsXcols, appended to container, with
     * table CSS classes cls (string or array) and all cells set to initial value.
     **/
    constructor(rows, cols, container, initial, cls) {
	if (!LiveTable.hasOwnProperty('_instanceCounter'))
	    LiveTable._instanceCounter = 0;
	    
	this._instanceId = ++LiveTable._instanceCounter;

	if (typeof(cls) != "string")
	    cls = cls.join(' ');
	
	var e = this._element = $('<table></table>');
	e.prop('id', 'livetable-' + this._instanceId);

	e.addClass(cls || '');

	e.appendTo(container);

	// Construct initial content.
	for (var r = 0; r < rows; r++) {

	    var aRow = $('<tr></tr>');
	    
	    for (var c = 0; c < cols; c++) {
		$('<td></td>').html(initial).appendTo(aRow);
	    }

	    aRow.appendTo(e);
	}
    }

    get element() {
	return this._element;
    }
    
    // Sets (and renders) a value to the table. This can be HTML.
    set(row, col, val) {
	return this.get(row, col).html(val);
    }

    // Retrieves a jQuery object for the cell. Allows for more direct interaction.
    get(row, col) {
	return this._element.find('tr:nth-of-type(' + (row + 1) + ') td:nth-of-type(' + (col + 1) + ')');
    }

    destroy() {
	this._element.remove();
    }
}
