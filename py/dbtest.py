""" Demo plugin. Demonstrates database connection and simple ouptut. """

def run():
    print("dbtest.py invoked.")
    retvals = {}
    for d,k in get_databases().items():
        if test_database_connection(k):
            retvals[d] = True
        else:
            retvals[d] = False

    return retvals

print("dbtest.py loaded!")

if "debug" in query and query["debug"] == "names":
    print("Following names are known in this scope:")
    print(dir())
