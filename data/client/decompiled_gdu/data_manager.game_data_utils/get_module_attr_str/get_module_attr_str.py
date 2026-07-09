# Source Generated with Decompyle++
# File: get_module_attr_str.pyc (Python 3.11)

if value == 0:
    value_str = '--'
else:
    value_str = str(int(value))
if unit_str:
    return '{}{}'.format(value_str, unit_str)
