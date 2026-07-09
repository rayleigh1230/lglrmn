# Source Generated with Decompyle++
# File: get_default_language_code.pyc (Python 3.11)

Tb_cfg_union_language = Tb_cfg_union_language
import common.config.db
ret = { }
for lang_code, info in six.iteritems(Tb_cfg_union_language.get_all_data()):
    if info[Tb_cfg_union_language.LANGUAGE_TYPE] != 0:
        ret[info[Tb_cfg_union_language.LANGUAGE_TYPE]] = lang_code
    return ret
