# Source Generated with Decompyle++
# File: chunk_list.pyc (Python 3.11)

if chunk_size <= 0:
    raise ValueError('chunk_size must be positive')
return range(0, len(data_list), chunk_size)()
