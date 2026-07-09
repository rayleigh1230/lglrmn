# Source Generated with Decompyle++
# File: format_res_num_for_refine.pyc (Python 3.11)

if common_config.get_game_region() == common_config.REGION_CHINA:
    if num >= 100000000:
        if num % 100000000 < 1000000:
            return '{}{}'.format(format(num / 100000000), language.HUNDRED_MILLION).replace(',', '')
        return None.format(format(math.floor((num / 1e+08) * 100) / 100, '.4g'), language.HUNDRED_MILLION).replace(',', '')
    if None >= 10000:
        if num % 10000 < 100:
            return '{}{}'.format(format(num / 10000, '.4g'), language.TEN_THOUSAND).replace(',', '')
        return None.format(format(math.floor((num / 10000) * 100) / 100, '.4g'), language.TEN_THOUSAND).replace(',', '')
    return None(format(num, '.4g')).replace(',', '')
if None >= 1000000000:
    return '{}B'.format(format(round(num / 1e+09, 2), '.4g')).replace(',', '')
if None >= 1000000:
    return '{}M'.format(format(round(num / 1e+06, 2), '.4g')).replace(',', '')
if None >= limit:
    return '{}K'.format(format(round(num / 1000, 2), '.4g')).replace(',', '')
return None(format(num, '.4g')).replace(',', '')
