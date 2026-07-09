# Source Generated with Decompyle++
# File: int_to_bits.pyc (Python 3.11)

mask = (1 << bit_width) - 1
return bin(n & mask)[2:].zfill(bit_width)
