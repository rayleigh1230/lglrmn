# Source Generated with Decompyle++
# File: find_nonself_records.pyc (Python 3.11)

result = { }
user_id = self.user_id
for table_id, table_date in six.iteritems(self._game_table_dict):
    table_field = TableMap.get(table_id)
    if not table_field:
        continue
    if is_new_type and table_field not in self.new_2022_protocol_table:
        continue
    user_id_key = getattr(table_field, 'USER_ID_KEY', None)
    if user_id_key:
        continue
    is_borrow_table = table_id in (TableID.TEAM_BORROW_USE, TableID.SHIP_BORROW)
    borrow_key = getattr(table_field, 'BORROW_USERID', None)
    excutor_userid_key = getattr(table_field, 'EXCUTOR_USERID', None)
    record_id_set = set()
    result[table_id] = set()
    for r_id, record in six.iteritems(table_date):
        if is_borrow_table and borrow_key and record[borrow_key] == user_id:
            continue
        if record[user_id_key] == user_id:
            continue
        if excutor_userid_key and excutor_userid_key in record and record[excutor_userid_key] == user_id:
            continue
        record_id_set.add(r_id)
        return result
