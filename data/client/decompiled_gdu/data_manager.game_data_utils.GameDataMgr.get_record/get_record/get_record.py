# Source Generated with Decompyle++
# File: get_record.pyc (Python 3.11)

if table_name == TableID.PLAN:
    plan_utils = plan_utils
    import common
    return plan_utils.get_plan_record(key)
table_data = None._game_table_dict.get(table_name)
if table_data and key in table_data:
    return table_data[key]
