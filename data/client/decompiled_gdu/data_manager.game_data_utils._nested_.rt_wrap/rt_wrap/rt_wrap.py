# Source Generated with Decompyle++
# File: rt_wrap.pyc (Python 3.11)

is_calc = isinstance(_ret, EnhanceCalculator)
if is_calc and calculation_mode == CALC_MODE_ONLY_VALUE:
    return modifier(_ret.calculate_full())
if None:
    return _ret
return modifier(_ret)
