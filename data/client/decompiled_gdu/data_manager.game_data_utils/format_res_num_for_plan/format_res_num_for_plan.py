# Source Generated with Decompyle++
# File: format_res_num_for_plan.pyc (Python 3.11)

if num == 0:
    return '0'
str_len = None(str(num))
str_prefix = '?' * ((str_len - 1) % 3 + 1)
str_suffix = ''
if common_config.get_game_region() == common_config.REGION_CHINA:
    if str_len >= 9:
        str_suffix = language.HUNDRED_MILLION
    elif str_len >= 5:
        str_suffix = language.TEN_THOUSAND
    elif str_len >= 10:
        str_suffix = 'B'
    elif str_len >= 7:
        str_suffix = 'M'
    elif str_len >= 4:
        str_suffix = 'K'
return str_prefix + str_suffix
