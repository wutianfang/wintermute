import time

def log_notice(msg):
    print("[notice] [{time}]: {msg}".format(time=time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(time.time())), msg=msg))


def log_warning(msg):
    print("\033[0;31m[warning]\033[0m[{time}]: {msg}".format(time=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time())), msg=msg))


