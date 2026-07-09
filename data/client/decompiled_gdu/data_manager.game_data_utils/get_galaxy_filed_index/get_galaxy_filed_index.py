# Source Generated with Decompyle++
# File: get_galaxy_filed_index.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.SYS_PARAM, SysParamField.Id.ID_GALAXY_INDEX)
if not record:
    return 0
galaxy_index = None(record[SysParamField.VALUE])
return galaxy_index
