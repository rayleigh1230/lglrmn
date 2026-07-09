# Source Generated with Decompyle++
# File: format_res_num.pyc (Python 3.11)

if isinstance(num, str):
    num = int(num)
if common_config.get_game_region() == common_config.REGION_CHINA:
    dp = decimal_places if decimal_places else 3
    factor = 10 ** dp
    sig_digits = dp + 1
    fmt = '.{}g'.format(sig_digits)
    if num >= 100000000:
        return '{}{}'.format(format(math.floor((num / 1e+08) * factor) / float(factor), fmt), language.HUNDRED_MILLION).replace(',', '')
    if None >= 10000:
        return '{}{}'.format(format(math.floor((num / 10000) * factor) / float(factor), fmt), language.TEN_THOUSAND).replace(',', '')
    return None(num).replace(',', '')
dp = decimal_places if None else 3
sig_digits = dp + 1
fmt = '.{}g'.format(sig_digits)
if num >= 1000000000:
    return '{}B'.format(format(round(num / 1e+09, dp), fmt)).replace(',', '')
if None >= 1000000:
    return '{}M'.format(format(round(num / 1e+06, dp), fmt)).replace(',', '')
if None >= limit:
    return '{}K'.format(format(round(num / 1000, dp), fmt)).replace(',', '')
return None(num).replace(',', '')
