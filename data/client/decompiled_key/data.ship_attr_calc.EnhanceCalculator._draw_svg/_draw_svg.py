# Source Generated with Decompyle++
# File: _draw_svg.pyc (Python 3.11)


try:
    base_name = 'calc'
    if not base_name:
        raise ValueError
    import subprocess
    cmd = [
        'dot',
        '-Tsvg',
        '-o',
        'calc.svg',
        'calc.dot']
    dot = subprocess.Popen(cmd, close_fds = False)
    dot.wait()
    if dot.returncode != 0:
        raise ValueError
    print('Graph written to {}.svg'.format(base_name))
    return None
    except Exception:
        print('auto draw failed')
        return None

