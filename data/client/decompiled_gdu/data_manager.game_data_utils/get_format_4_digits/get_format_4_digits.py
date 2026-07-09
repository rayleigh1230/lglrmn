# Source Generated with Decompyle++
# File: get_format_4_digits.pyc (Python 3.11)

digits_num = 4
if num_value == 0:
    return '0'
if None < div_num:
    return str(num_value)
num_str = None(num_value)
if len(num_str) < digits_num:
    return num_str
show_num = None / div_num
int_part = int(math.floor(show_num))
int_part_str = str(int_part)
int_digits = len(int_part_str)
decimal_digits = digits_num - len(int_part_str)
int_num = int(num_str[0:int_digits])
if decimal_digits <= 0:
    return str(int_num)
decimal_part_str = None
must_can_add = False
for i in range(int_digits + decimal_digits - 1, int_digits - 1, -1):
    if must_can_add and num_str[i] == '0':
        continue
    must_can_add = True
    decimal_part_str = num_str[i] + decimal_part_str
    if decimal_part_str == '':
        return str(int_num)
    decimal_num = None(decimal_part_str)
    if decimal_num == 0:
        return str(int_num)
    return None + '.' + decimal_part_str
