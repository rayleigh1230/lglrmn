# Source Generated with Decompyle++
# File: is_point_in_triangle.pyc (Python 3.11)

if len(trangle) != 3:
    return False
a = None[0]
b = trangle[1]
c = trangle[2]
ab = (b[0] - a[0], b[1] - a[1])
bc = (c[0] - b[0], c[1] - b[1])
ca = (a[0] - c[0], a[1] - c[1])
ap = (p[0] - a[0], p[1] - a[1])
bp = (p[0] - b[0], p[1] - b[1])
cp = (p[0] - c[0], p[1] - c[1])
n = None
for p1, p2 in ((ab, ap), (bc, bp), (ca, cp)):
    v = p1[0] * p2[1] - p1[1] * p2[0]
    if n:
        n = v
        continue
    if n * v < 0:
        return False
    return True
