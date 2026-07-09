# Source Generated with Decompyle++
# File: get_financial_record.pyc (Python 3.11)

FinancialField = FinancialField
import common.config.table_definition
table = GameDataMgr().get_table(TableID.FINANCIAL)
for record in six.itervalues(table):
    if record[FinancialField.USERID] == GameDataMgr().user_id:
        
        return None, record
    return None
