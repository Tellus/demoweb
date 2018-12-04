/**
 * Contains all possible query filters. Use methods:
 * var filters = require('filters.js');
 * filters.enum(filterInstance);
 * filters('enum', filterInstance);
 **/

/**
 * I've reworked the way filters work in the Node port, mostly as an attempt to
 * make them more modular and easy to work with. A filter is a function that is
 * run on a reference value (from the actual query string) against some filter
 * parameters. It returns something appropriate for the filter, either:
 * - a transformation (a new state for the query string parameter)
 * - a boolean (to indicate query string validity)
 *
 * NOTE also that I have had to modify several filter names as some clashed with
 * JavaScript's own reserved keywords:
 * - enum -> inEnum
 * - default -> defaultValue
 * The catch-all run function may still try to match old filter names to new
 * functions but this is not guaranteed in the long run! Debate is afoot!
 **/

var filterAlises = {
    'enum': inEnum,
    'default': defaultValue
}

/**
 * Catch-all. Attempts to delegate to appropriate filter, if available.
 * filter - string name of the filter, e.g. 'enum'
 * qdef - the QueryDefParameter to use for the match.
 * ...args - all arguments to the filter, e.g. 'monday'
 **/
function run(filter, qdef, ...args) {
    if (!module.exports.hasOwnProperty(filter))
        throw util.format("Unknown filter '%s'", filter);
    else
        return module.exports[filter](qdef, ...args);
}
module.exports = run;

function inEnum(goodValues, testValue) {
    return testValue in goodValues;
}
module.exports.inEnum = inEnum;

function defaultValue(defValue, inputValue) {
    if (!inputValue) return defValue;
    else return inputValue;
}
module.exports.defaultValue = defaultValue;

/**
 * Capitalizes input. If input is an array, capitalize each element.
 **/
function capitalize(input) {
    if (!input) return undefined;
    else if (Array.isArray(input)) {
        // Array-type. Capitalize each.
        return input.map(capitalize);
    } else {
        switch (input.length) {
        case 0: return input;
        case 1: return input.toUpperCase();
        default: return input[0].toUpperCase() + input.slice(1).toUpperCase();
        }
    }
}
module.exports.capitalize = capitalize;

/**
 * Ensure the input is treated as an array, regardless of number of arguments.
 * If first parameter is an array, return it as-is.
 * Otherwise, returns the args array.
 **/
function asArray(...args) {
    if (Array.isArray(args[0])) return args[0];
    else return args;
}
module.exports.asArray = asArray;

