# Source Generated with Decompyle++
# File: parse_asset_pack_sp_data_for_server.pyc (Python 3.11)

res_type = data[0]
cfg_item_id = None
pack_id_u = None
num = 1
if len(data) == 2:
    cfg_item_id = data[1]
elif data[1] < 50:
    cfg_item_id = data[2]
    num = data[1]
    pack_id_u = 0
else:
    cfg_item_id = data[1]
    pack_id_u = data[2]
return (res_type, cfg_item_id, pack_id_u, num)
