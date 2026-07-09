# Source Generated with Decompyle++
# File: format_short_num.pyc (Python 3.11)

l10 = int(math.log10(num))
num_str = str(num)
return num_str[0] + '0' * l10 + '+'
