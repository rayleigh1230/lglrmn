# Source Generated with Decompyle++
# File: get_module_attr_value_cached.pyc (Python 3.11)

_k = (module_id, attr_type, slot_id, enhancements, str(modules) if modules else '', drone_slot_id)
cached_ret = _CACHE_MODULE_ATTR.get(_k)
if cached_ret:
    return cached_ret
calc = None(module_id, attr_type, slot_id, enhancements, modules, drone_slot_id, calculation_mode = CALC_MODE_CALCULATOR)
cache = (calc, calc.calculate_full(), calc.enhance_desc_detail().output_name_enhance_val())
_CACHE_MODULE_ATTR[_k] = cache
return cache
