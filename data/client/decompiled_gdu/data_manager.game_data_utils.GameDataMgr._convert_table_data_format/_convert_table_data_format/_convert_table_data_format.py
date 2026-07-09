# Source Generated with Decompyle++
# File: _convert_table_data_format.pyc (Python 3.11)

if not table_data:
    return table_data
if None(table_data[0], dict):
    return table_data
field_names = None[0]
field_count = len(field_names)
result = []
for row in table_data[1:]:
    if len(row) != field_count:
        print('[ERROR] _convert_table_data_format error: field count {} != value count {}, fields: {}, row: {}'.format(field_count, len(row), field_names, row))
        continue
    result.append(dict(zip(field_names, row)))
    return result
