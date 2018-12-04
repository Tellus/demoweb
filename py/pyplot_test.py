""" Demo plugin. Generates a pyplot chart, stores it as a temp image, and serves it. """

def run():
    import numpy as np
    from matplotlib import pyplot as plt

    x = np.arange(-10, 10, 0.1)
    y = x**3 + 2*x**2 - 5
    fig = plt.figure()

    ax = fig.add_subplot(211)
    ax.plot(x, y)
    ax.set_title("Demo Plot")
    ax.grid(True)
    ax.set_xlabel("x")
    ax.set_ylabel("y")

    p = tmp_img_path("%s.png" % (md5_hex("pyplot_img")))

    print(tmp_img_path(p))
    
    plt.savefig(p)
    
    return bottle.static_file(p, root="./")
