'use strict';

/*
  Loads/stores/monitors the URL in regards to changes in the UI.

  This is to allow users to reload a bookmarked url and re-stablish the state of
  the page at that time.

  This file allows subscribing to changes and handling them with a combination
  of the history API (which *must* be supported!) and URI.js.

  The code wraps/overloads URI.js object functions so we can replace the state
  every time a piece of the URI is set. It's ugly, but responsive.
*/

(function(pagestate, $, undefined) {
    
    function onStateChanged() {
        window.history.replaceState(null, 'ITSPx1', pagestate.toString());
    }
    
    pagestate.__setQuery = pagestate.setQuery;
    pagestate.setQuery = (...args) => {
        var retval = pagestate.__setQuery(...args);
        onStateChanged();
        return retval;
    };

    pagestate.__setSearch = pagestate.setSearch;
    pagestate.setSearch = (...args) => {
        var retval = pagestate.__setSearch(...args);
        onStateChanged();
        return retval;
    };

    pagestate.__addQuery = pagestate.addQuery;
    pagestate.addQuery = (...args) => {
        var retval = pagestate.__addQuery(...args);
        onStateChanged();
        return retval;
    };

    pagestate.__addSearch = pagestate.addSearch;
    pagestate.addSearch = (...args) => {
        var retval = pagestate.__addSearch(...args);
        onStateChanged();
        return retval;
    };

    pagestate.__removeQuery = pagestate.removeQuery;
    pagestate.removeQuery = (...args) => {
	var retval = pagestate.__removeSearch(...args);
	onStateChanged();
	return retval;
    };

    pagestate.__removeSearch = pagestate.removeSearch;
    pagestate.removeSearch = (...args) => {
	var retval = pagestate.__removeSearch(...args);
	onStateChanged();
	return retval;
    };
    
}(window.pagestate = window.pagestate || URI(window.location), jQuery));
