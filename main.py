#!/bin/env python3

import bottle, yaml, re, os, datetime, psycopg2 as psql, inspect
from psycopg2.extras import DictCursor, DictConnection
from glob import glob
from collections import abc
import simplejson as json

def isnonstriter(value):
    """Shorthand, because we're using it so often. Returns true if the value
    is iterable but NOT a string. False otherwise."""
    if isinstance(value, abc.Iterable):
        if isinstance(value, str):
            return False
        return True
    return False

class AgentPlugin(object):
    """ Dumps agent and URL info on every request. """

    name = "AgentPlugin"

    def setup(self, app=None):
        print("AgentPlugin installed.")

    def apply(self, callback, route=None):
        print("AgentPlugin applied.")
        print("Inbound agent: %s" % bottle.request.headers.get('user-agent'))
        print("%s" % bottle.request.url)
        writeLog("GET: %s " % bottle.request.url)

        return self

    def close(self):
        print("AgentPlugin shutting down.")

bottle.install(AgentPlugin)

## UTILITY FUNCTIONS

def tmp_img_path(append):
    """ Returns the absolute path to the temporary image directory. Optionally,
    append the string in append as a path. """
    return os.path.join(os.path.abspath("."), "tmp", append)

def md5_hex(string):
    """ Hashes the input string and returns its hex string. Good for tmp file names. """
    from hashlib import md5
    m = md5()

    m.update(string.encode("utf-8"))

    return m.hexdigest()

## END UTILITY FUNCTIONS

## EXCEPTIONS

class QueryFilterError(Exception):
    pass

class EnumFilterError(QueryFilterError):
    pass

class MissingParameterError(Exception):
    pass

class BadParameterError(Exception):
    pass

class QueryError(Exception):
    pass

## END EXCEPTIONS

class QueryFilters(object):
    """
    This class contains methods used for the filters in the miniscule mini-language.
    Each function takes the value of from the query string along with the
    parameters passed to the filter.
    """

    def run(qdef, filter_):
        """Catchall - runs the given filter against the passed query definition,
        assuming such filter is available."""
        if not hasattr(QueryFilters, filter_.name):
            raise QueryFilterError("The filter %s does not exist." % filter_.name)
        
        fn = getattr(QueryFilters, filter_.name)
        args = inspect.getargs(fn.__code__)

        print("Calling %s on %s with arg %s" % (filter_.name, qdef.get_value(), filter_.params))

        if args.varargs is not None:
            if filter_.params is None:
                raise QueryFilterError("The filter %s expects a parameter but none given." % filter_.name)
            else:
                fn(qdef, *filter_.params)
        elif args.varargs is None:
            if filter_.params is not None:
                raise QueryFilterError("The filter %s does not expect a parameter but one was given." % filter_.name)
            else:
                fn(qdef)

        return qdef

    def default(qdef, *args):
        """Sets a default value for the QueryDefParameter if it has none."""
        if qdef.get_value() is None:
            qdef.set_value(args[0])
        return True

    def capitalize(qdef):
        """Runs str.capitalize on the value(s)."""
        val = qdef.get_value()
        if isinstance(val, str):
            qdef.set_value(val.capitalize())
        elif isinstance(val, abc.Iterable):
            qdef.set_value([x.capitalize() for x in qdef.get_value()])
        elif val is None:
            raise QueryFilterError("capitalize: requires a value for %s!" % qdef.name)
        else:
            raise QueryFilterError("capitalize: unknown value type " % type(val))
        return True

    def asarray(qdef):
        """Applies a boolean to the qdef, signifying it should be represented as
        an array, regardless of number of items."""
        if qdef.get_prop("asrow"):
            raise QueryFilterError("Cannot represent %s as both a row and an error." % qdef.get_value())
        qdef.set_prop("asarray", True)
        return True

    def asrow(qdef):
        """Applies a boolean to the qdef, signifying it should be represented as
        a row, regardless of the number of items."""
        if qdef.get_prop("asarray"):
            raise QueryFilterError("Cannot represent %s as both a row and an error." % qdef.get_value())
        qdef.ste_prop("asrow", True)

    def enum(qdef, *args):
        """Tests the value or values passed against acceptable values in args.
        Raises an error if one does not match."""
        val = qdef.get_value()
        print("ENUM: %s against %s" % (val, list(args)))
        if isinstance(val, str):
            if val not in args:
                raise EnumFilterError("The value %s is not part of the enum (%s)" % (val, list(args)))
        elif isinstance(val, abc.Iterable):
            for cand in val:
                if cand not in args:
                    raise EnumFilterError("One of the values (%s) is not part of the enum (%s)" % (cand, list(args)))
        else:
            raise EnumFilterError("enum: unknown value type " % type(val))
        return True

def getLogPath():
    return os.path.join(get_config()['log_path'], 'current.log')

def writeLog(content):
    f = None
    log_path = getLogPath()
    if os.path.isfile(log_path):
        f = open(log_path, "a")
    else:
        f = open(log_path, "w")
    f.write("%s: %s\n" % (str(datetime.datetime.now())[:-7], content))

class QueryDefParameter(object):
    """Representation of a single query definition parameter. Contains one
    name parameter and zero or more QueryDefParameterFilter."""

    regex = re.compile(r"%\((?P<parameter>\w+)(?P<filters>(?:\|\w+(?::\w+(?:,\w+)*)?)*)\)s")

    filter_regex = re.compile(r"(?:\|(\w+(?::\w+(?:,\w+)*)?))")

    def __init__(self, paramstr):
        self.raw = paramstr
        self._value = None
        self._props = {}

        match = self.regex.match(paramstr)

        if match is None:
            raise BadParameterError("The parameter string '%s' is not valid." % paramstr)
        
        groups = match.groupdict()

        self.name = groups["parameter"]
        
        self.filters = []

        for filter in self.filter_regex.findall(groups["filters"]):
            self.filters.append(QueryDefParameterFilter(filter))

    def validate(self):
        for f in self.filters:
            QueryFilters.run(self, f)

    def set_prop(self, key, value):
        """Sets arbitrary properties."""
        self._props[key] = value

    def get_prop(self, key):
        return self._props.get(key)

    def get_value(self):
        """Returns the current value of the parameter."""
        return self._value

    def set_value(self, value):
        """Sets a new value for the parameter."""
        self._value = value

    def sql_value(self):
        """Converts the value to an SQL representation. Most basic types are
        converted as-is. Any non-string iterable is converted to a set, e.g:
        ["Monday", "Tuesday"] is converted to ('Monday', 'Tuesday')"""
        value = self.get_value()
        if self.get_prop("asarray"):
            if isnonstriter(value): # Handle non-string iterable case.
                return "array['%s']" % "','".join(value)
            else:
                return "array['%s']" % value
        elif self.get_prop("asrow"):
            if isnonstriter(value): # Handle non-string iterable case.
                return "('%s')" % "'.'".join(value)
            else:
                return "('%s')" % value
        else:
            return value

class QueryDefParameterFilter(object):
    """Represents a single filter for a a QueryDefParameter. Contains one
    filter name and zero or more filter parameters."""

    regex = re.compile(r"(?P<name>\w+)(?::(?P<params>(?:\w+)(?:,\w+)*))?")

    def __init__(self, filterstr):
        self.name, self.params = self.regex.match(filterstr).groups()

        if self.params is not None:
            self.params = self.params.split(",")

class QueryDef(object):
    """Handles parsing of full query definitions to extract query string
    parameters and their filters."""

    regex = re.compile(r"%\(\w+(?:\|\w+(?::\w+(?:,\w+)*)?)*\)s")

    def __init__(self, querydef):
        """Retrieves all named parameters of the given query. We use Python's own
        named parameters for string formatting later, the format works with this.
        The format is %(<parameter_name>[|<filter>[:fparam0[,fparamN]]])s
        In other words, first the name of the parameter from the query string, then
        an optional list of filters (see QueryFilters) with their corresponding
        parameters. For example, asking for the granularity with a default of 15:
        %(granularity|default:15)s"""

        self.name = querydef["name"]
        self.query = querydef["query"]

        self.params = []

        for param in set(self.regex.findall(querydef["query"])):
            print("Parsing individual %s" % param)
            self.params.append(QueryDefParameter(param))
            if self.params[-1].name == "TIME_CONDITIONS":
                print("WARNING! TIME_CONDITIONS HAS BEEN DEPRECATED! FIX YOUR QUERY DEFINITION %s " % self.name)

    def keys(self):
        """Returns a list of all parameter names in the query definition."""
        o = []
        for param in self.params:
            o.append(param.name)
        return o

    def param(self, key):
        """Retrieves a QueryDefParameter by its name."""
        for param in self.params:
            if param.name==key:
                return param
        return None

    def add_query(self, query=None):
        """Adds in an actual query string. A merge happens by adding the value
        to the formal parameter, matched by name. The validation step will raise
        an error if no value remains after running filters on the parameter."""
        if query is None:
            print("Warning: No query passed, using global.")
            query = bottle.request.query

        for param in query.keys():
            if param not in self.keys():
                print("Warning. Query string has key %s which is not in query def. Ignoring." % param)
            else:
                val = query.getall(param)
                vlen = len(val)

                if vlen == 0:
                    print("Warning! Parameter %s has no value!" % param)
                    self.param(param).set_value(None)
                elif vlen == 1:
                    self.param(param).set_value(val[0])
                else:
                    self.param(param).set_value(val)

    def validate(self):
        """Validates current state of the query definition and actual values.
        This is done by running through each parameter, executing its filters
        (if possible) in order. If a parameter has no value after executing all
        of its filters, an error is raised."""
        for param in self.params:
            param.validate()
            if param.get_value() is None or param.get_value()=="":
                raise QueryError("The parameter %s cannot be empty." % param.name)

    def generate(self):
        """Generates a complete PostgreSQL-compatible SQL query. I realise we've
        completely omitted the Python named parameter method at this point..."""
        result = self.query
        for param in self.params:
            result = result.replace(param.raw, param.sql_value())

        return result

def get_config():
    return yaml.load(open('config.yaml', 'r'))

def dbConnect(db=None):
    """Connects to the given database. If no connection name is specified,
    use the default connection. """
    db = get_database(db)

    return psql.connect("host=%(host)s port=%(port)s dbname=%(database)s user=%(user)s password=%(password)s" % db)

def runQuery(query_name, query_data):
    """Will try to parse a query in <query_name>.json and execute it against the
    active database connection."""
    # Attempt to retrieve file.
    try:
        qfile = yaml.load(open("query/%s.yaml" % query_name, 'r'))
        query_def = QueryDef(qfile)

        query_def.add_query(query_data)

        query_def.validate()

        db_query = query_def.generate()

        print(db_query)

        if query_data.get('debug') == 'query':
            return '<pre>%s</pre>' % db_query.replace('\n', '<br/>')

        # Use a specific database connection if specified by the query file.
        #conn = dbConnect(qfile['connection'] if 'connection' in qfile else None)
        conn = dbConnect(qfile.get('connection') or None)
        cur = conn.cursor()
        cur.execute(db_query)

        vals = ""

        rtype = qfile.get('result')

        if rtype == 'json': # Already json. Return single.
            vals = cur.fetchone()
        elif rtype == 'scalar':
            vals = cur.fetchone()
        elif rtype == 'single': # Takes a single row and returns it as a JSON object.
            row = cur.fetchone()
            vals = {}
            for r in range(len(row)):
                vals[cur.description[r][0]] = row[r]
        else:
            # I'll be honest, this one line was dragged from stackoverflow:
            # http://stackoverflow.com/questions/3286525/return-sql-table-as-json-in-python
            r = [dict((cur.description[i][0], value) for i, value in enumerate(row)) for row in cur.fetchall()]
            vals = json.dumps(r)

        cur.close()
            
        return vals
    except FileNotFoundError as err:
        bottle.response.status=400
        return "<pre>The query %s does not exist.</pre>" % query_name
    except MissingParameterError as err:
        bottle.response.status=400
        return str(err)
    except psql.OperationalError as err:
        bottle.response.status=500
        return str("<pre>Server-side error: %s</pre>" % err)
    except psql.ProgrammingError as err:
        bottle.response.status=500
        return str("<pre>Query error: %s\nFull query:\n\n%s</pre>" % (err, db_query))
    except psql.InternalError as err:
        bottle.response.status=500
        return str("<pre>Internal error: %s" % err)

def pug_render(name):
    """ Runs pug on a file given by name. Returns the PATH to the new file (!!) """
    import subprocess
    print("Attempting to render template %s" % name)
    try:
        subprocess.call(("pug -P ./pug/%s.pug --out ./rendered/" % name).split())
    except FileNotFoundError:
        print("FileNotFoundError! Assuming bad path. Retrying as shell command.")
        subprocess.call(("pug -P ./pug/%s.pug --out ./rendered/" % name).split(), shell=True)
        
    return "./rendered/%s.html" % name

# Route for querying.
@bottle.route('/query/<query_name>')
def doQuery(query_name):
    print("\n---* START QUERY *---\n")
    print("Inbound agent: %s" % bottle.request.headers.get('user-agent'))
    print("%s" % bottle.request.url)
    writeLog("GET: %s " % bottle.request.url)
    return runQuery(query_name, bottle.request.query)

# Route for Python script exeuction.
@bottle.route('/py/<script_name>')
def doScript(script_name):
    src_path = "py/%s.py" % script_name
    try:
        src = "".join(open(src_path, "r").readlines())
    except FileNotFoundError as e:
        bottle.abort(404, "No such script file")
        return False

    from types import ModuleType
    module = ModuleType(script_name)
    
    try:
        compiled = compile(src, src_path, "exec")
    except SyntaxError as e:
        print("Syntax error in script file '%s'!" % src_path)
        bottle.abort(500, "Script syntax error.")
        return False

    # A script plugin will have access to databases as well as the bottle module and pug rendering.
    # Currently, it can import all the necessary code it otherwise needs.
    # THIS IS A MAJOR SECURITY VULNERABILITY! NEVER LET ANYONE UPLOAD TO THE PY DIRECTORY!
    exec(compiled, { "pug_render": pug_render, "get_database": get_database, "get_databases": get_databases, "bottle": bottle, "dbConnect": dbConnect, "test_database_connection": test_database_connection, "query": bottle.request.query, "tmp_img_path": tmp_img_path, "md5_hex": md5_hex }, module.__dict__)

    print("SCRIPT (%s): %s" % (module.__name__, module.__doc__))

    if "run" not in module.__dict__:
        print("Error! No run function defined in plugin!")
        bottle.abort(500, "Error! No run function defined in plugin!")
    
    return module.run()

# Static routes.
@bottle.route('/css/<filename:path>')
def send_css(filename):
    return bottle.static_file(filename, root='css')

@bottle.route('/js/<filename:path>')
def send_js(filename):
    return bottle.static_file(filename, root='js')

@bottle.route('/lib/<filename:path>')
def send_bower(filename):
    return bottle.static_file(filename, root='bower_components')

@bottle.route('/img/<filename:path>')
def send_img(filename):
    return bottle.static_file(filename, root='img')

@bottle.route('/static/<filename:path>')
def send_html(filename):
    return bottle.static_file(filename, root='static')

@bottle.route('/')
def index_page():
    return bottle.static_file(pug_render('index'), root='')

@bottle.route('/fogbat')
def fogbat_page():
    return bottle.static_file(pug_render('fogbat'), root='')

@bottle.route('/itspx1')
def itspx1():
    return bottle.static_file(pug_render('itspx1'), root='')

@bottle.route('/itspx2')
def itspx1():
    return bottle.static_file(pug_render('itspx2'), root='')

@bottle.route('/db/test')
def db_test():
    databases = get_databases().values()
    for db in databases:
        good = test_database_connection(db)
        if good:
            db['status'] = 'OK'
        else:
            db['status'] = 'BAD'
            db['error'] = get_connection_error(db)
    return bottle.template("./views/db_test.tpl",
                           databases=databases)

def test_database_connection(db):
    """Tests the given database connection. Its inner workings are somewhat
    undefined but will at the very least try and connect, then disconnect."""
    good = None
    try:
        conn = psql.connect("host=%(host)s port=%(port)s dbname=%(database)s user=%(user)s password=%(password)s" % db)
        return True
    except psql.OperationalError as e:
        return False

def get_connection_error(db):
    try:
        conn = psql.connect("host=%(host)s port=%(port)s dbname=%(database)s user=%(user)s password=%(password)s" % db)
        return None
    except psql.OperationalError as e:
        return e

def get_database(name = None):
    """ Retrieves database connection information for a given database. If no
    parameter, returns the *default* connection information. """
    if name is None:
        return get_databases()[get_config()['connection']]
    else:
      return get_databases()[name]

def get_databases(path = None):
    """Retrieves all database configurations from the given path. If no path is
    given, the connections path from the main config file is used."""
    if path is None:
      path = get_config()['connection_path']
        
    db_files = glob(os.path.join(path, "*.yaml"))
    db_dict = {}
    required_params = ['name', 'database']
    optional_params = ['host', 'port', 'user', 'password']
    for f_p in db_files:
        f = open(f_p, 'r')
        db_c = yaml.load(f)
        f.close()
        good_conf = False
        for p in required_params:
            if p not in db_c:
                print("Cannot load connection %s - missing parameter %s" % (f_p, p))
                break
        good_conf = True
        for p in optional_params:
            if p not in db_c:
                print("Warning! Connection %s missing parameter %s" % (f_p, p))
        if good_conf:
            db_dict[db_c['name']] = db_c
    return db_dict

# Run
if __name__ == '__main__':
    conf = get_config()['server']

    print("Starting server on %s:%s with backend '%s'." % (conf['host'] or "0.0.0.0", conf['port'] or 8080, conf['mode'] or 'wsgiref'))
    
    if conf['mode'] == 'gevent':
        # Experimental multhreading
        print("EXPERIMENTAL ASYNC I/O")
        from gevent import monkey; monkey.patch_all()
        bottle.run(host=conf['host'] or "0.0.0.0", port=conf['port'] or 8080, server='gevent')
    else:
        try:
            backend = conf['mode']
            bottle.run(host=conf['host'] or "0.0.0.0", port=conf['port'] or 8080, server=backend)
        except ImportError as e:
            print("Failed to run server with backend %s. Falling back to wsgiref." % backend)
            bottle.run(host=conf['host'] or "0.0.0.0", port=conf['port'] or 8080, server="wsgiref")

