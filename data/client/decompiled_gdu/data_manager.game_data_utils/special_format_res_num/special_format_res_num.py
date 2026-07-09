# Source Generated with Decompyle++
# File: special_format_res_num.pyc (Python 3.11)

if isinstance(num, str):
    num = int(num)
if common_config.get_game_region() == common_config.REGION_CHINA:
    if num >= 100000000:
        return '{}{}'.format(get_format_4_digits(num, 1e+08), language.HUNDRED_MILLION)
    if None >= 10000:
        return '{}{}'.format(get_format_4_digits(num, 10000), language.TEN_THOUSAND)
    return None(num)
if None >= 1000000000:
    return '{}B'.format(get_format_4_digits(num, 1e+09))
if None >= 1000000:
    return '{}M'.format(get_format_4_digits(num, 1e+06))
if None >= limit:
    return '{}K'.format(get_format_4_digits(num, 1000))
return None(num)
