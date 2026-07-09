# Source Generated with Decompyle++
# File: get_newbie_ets.pyc (Python 3.11)

version = get_newbie_montage_version()
if version not in common_definition.NEWBIE_ETS_DICT:
    version = configdata.NEWBIE_MONT_VERSION_1
return common_definition.NEWBIE_ETS_DICT[version]
