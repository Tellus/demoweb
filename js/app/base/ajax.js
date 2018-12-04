/**
 * Asynchronous and AJAX-related stuff.
 **/

(function(loaders, $, unused) {

    var active = [];

    loaders.remove = (element) => {
        var element = $(element);

        if (!element.parent('.dimmed').length)
            console.warn('Trying to remove non-existant loader.');
            
        element.parent('.dimmed').find('.dimmer-container').remove();
        element.unwrap('.dimmed');

        active.splice(active.indexOf(element), 1);
    }

    /**
     * Adds a dimmed loading box with custom HTML content.
     **/
    loaders.add = (element, content) => {
        element = $(element);
        content = content || '';

        if (element.parent('.dimmed').length) {
            console.warn('Element already dimmed. Won\'t double.');
            return;
        }
            
        if (active.indexOf(element) >= 0) return; // Don't double down.
        else active.push(element);

        element.wrap('<div class="dimmed"></div>');

        var dimmerContent = $('<div class="dimmer-container"></div>')
            .append('<div class="dimmer-content">' + content + '</div>')
            .append('<i class="loading-spinner fa fa-spinner fa-4x fa-spin fa-fw"></i>');        
        
        element.parent('.dimmed').append(dimmerContent)
    }

}(window.loaders = window.loaders || {}, jQuery, undefined));
