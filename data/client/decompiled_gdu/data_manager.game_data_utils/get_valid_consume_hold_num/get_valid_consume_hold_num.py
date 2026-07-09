# Source Generated with Decompyle++
# File: get_valid_consume_hold_num.pyc (Python 3.11)

time_utils = time_utils
import common
TableID = TableID
import common.config.table_definition
table = GameDataMgr().get_table(TableID.USER_CONSUME_ITEM)
if not table:
    return 0
cur_time = time_utils.get_server_time()
num = 0
for key, record in six.iteritems(table):
    if consume_item_id != record[UserConsumeItemField.CFG_CONSUME_ITEM_ID]:
        continue
    expire_time = record[UserConsumeItemField.EXPIRE_TIME]
    if cur_time < expire_time or expire_time == 0:
        num += 1
    return num
