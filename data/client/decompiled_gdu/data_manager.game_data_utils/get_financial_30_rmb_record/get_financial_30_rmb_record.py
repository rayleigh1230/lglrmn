# Source Generated with Decompyle++
# File: get_financial_30_rmb_record.pyc (Python 3.11)

Financial30RmbField = Financial30RmbField
import common.config.table_definition
table = GameDataMgr().get_table(TableID.FINANCIAL_30_RMB)
for record in six.itervalues(table):
    if record[Financial30RmbField.USERID] == GameDataMgr().user_id:
        
        return None, record
    return None
