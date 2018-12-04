/**
 * Node port of the QueryFilters functionality of the Python implementation.
 */

var fs = require('fs');
var path = require('path');
var yaml = require('yamljs');
var util = require('util');

var filters = require('./queryfilters.js');

// Path to the queries, given when the middleware was initialized.
var _queryPath = null;

// Regex gets all query definition parameters. Each match still needs parsing.
var allQueryDefParamRe = /%\(\w+(?:\|\w+(?::\w+(?:,\w+)*)?)*\)s/g;
/**
 * Regex for a single query def parameter, hauling out query string name
 * in one match and all filters in another.
 */
var queryDefParamRe = /%\((\w+)((?:\|\w+(?::\w+(?:,\w+)*)?)*)\)s/;

// RegEx to pull out all query def parameter filters.
// Format: QUERY_STRING_PARAM[|<FILTER_NAME[:FILTER_PARAM1[,FILTER_PARAMN]]>]
var filterRe = /(\w+)(?:\|(\w+(?::\w+(?:,\w+)*)?))/g;

class QueryDefParamFilter {
    constructor(filter) {

    }
}

/**
 * QueryDefParameter represents a formal parameter in the definition of a query.
 * We intentionally disconnect the formal definition from any specific query
 * string association. This will allow us to implement a caching behaviour for
 * query definitions later in the application's lifetime.
 **/
class QueryDefParameter {
    constructor(paramstr) {
        this.raw = paramstr;
        this._value = null;
        this._props = {};

        var tmp_re = new RegExp(queryDefParamRe);

        var match = tmp_re.exec(paramstr);

        if (!match) {
            var err = util.format('The parameter string %s is not valid!', paramstr);
            console.error(err);
        }

        console.log(match);

        this.name = match[1];

        this.filters = [];
        
        var tmp;
        tmp_re = new RegExp(filterRe);
        
        while (tmp = tmp_re.exec(match[2])) {
            console.log('Added filter %s', tmp);
            this.filters.push(tmp[0]);
        }
    }

    /**
     * Validates the QueryDefParameter against a given query string. This does
     * two things: Runs all transform filters (ensuring they work), and testing
     * all validation filters (ensuring they return true).
     **/
    validate(req) {
        var value;
        if (!req.query.hasOwnProperty(this.name))
            return [false, util.format('The query string %s was not passed.')];
        else value = req.query[this.name];
        
        var valid = true;

        // If the qstring value passed through any filter is null, it did not
        // meet a requirement (or it was null to begin with).
        
        for (filter of this.filters) {
            console.log('QueryDefParameter.validate(): step %s', filter.name);
            var [filterResult, filterErr] = filters.run(filter.name, req.params[this.name], filter.params);
            if (filterError) return [false, filterError];
        }

        return [true, null];
    }

    /**
     * Runs the filters and transformations for this parameter through a request
     * object. Namely, this involves pulling out the relevant part of the query
     * string and running it through the paces.
     **/
    sql(req) {
        var value;
        if (!req.query.hasOwnProperty(this.name))
            return [null, util.format('Passed request object does not contain a value for parameter %s', this.name)];
        else value = req.query[this.name];
        
        for (filter of this.filters) {
            value = filters.run(filter.name, filter.params, value);
        }

        return value;
    }
}

/**
 * The way we've implemented the query parser (independently from configs), is
 * to use a middleware on the query route. It intercepts the request, parses it,
 * and delivers a ready-to-run query to the next step, which can invoke the
 * database API.
 **/
function middleware(req, res, next) {
    if (!req.params.queryId) next('No query identifier in req.params.queryId');

    req.queryParser = req.queryParser || {};
    
    req.queryParser.path = path.join(_queryPath, req.params.queryId + '.yaml');
    
    // Ensure query exists.
    fs.stat(req.queryParser.path, (err, stats) => {
        if (err) return next(err);
        else if (!stats.isFile()) {
            res.status(404);
            return res.send('Unknown query "' + req.params.queryid + '".');
        } else return parseQuery(req, res, next);
    });
}

/**
 * Opens a yaml query definition, runs filters given the request query string
 * and the query definition itself, and stores it in req.queryParser.query
 **/
function parseQuery(req, res, next) {
    var queryDef = yaml.load(req.queryParser.path);

    console.log('Parsing ' + req.params.queryId + ', query "' + queryDef.name + '".');

    // Clone the RegExp - I want to avoid the internal pointer getting weird.
    var re = new RegExp(allQueryDefParamRe);
    
    var params = new Set();
    var qdparams = [];
    var tmp;

    // Parse the query definition.
    while (tmp = re.exec(queryDef.query)) {

        if (!params.has(tmp[0])) {
        
            params.add(tmp[0]);

            qdparams.push(new QueryDefParameter(tmp[0]));
        }
    }

    // Validate all QueryDefParameters against query string.
    for (param of qdparams) {
        if (!param.validate(req)) {
            console.error('Failed to validate %s', param.name);
            res.status(400);
            res.send(util.format('Validation error in %s', param.name));
            return;
        }
    }

    // At this point, we should be able to generate final SQL and run it.
    var sql = queryDef.query;

    for (param of qdparams) {
        console.log('Replacing %s in def with %s parsed', param.raw, param.sql(req));
        sql = sql.replace(param.raw, param.sql(req));
    }

    req.queryParser.sql = sql;
    
    return next();
}

module.exports = (queryPath) => {    
    if (!queryPath)
        throw 'Query path must be given!';
    else if (!fs.statSync(queryPath).isDirectory) {
        throw 'Query path ' + queryPath + ' is not a directory!';
    } else {
        _queryPath = queryPath;
        
        return middleware;
    }
};
