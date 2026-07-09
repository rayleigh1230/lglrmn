# Source Generated with Decompyle++
# File: add_union_view_item.pyc (Python 3.11)

insert_item_id = []
view_item_len = 3
view_item_num = len(data) / view_item_len
for i in range(view_item_num):
    id = data[i * view_item_len + 0]
    wid = data[i * view_item_len + 1]
    view_radius = data[i * view_item_len + 2]
    self.union_view_item_dict[id] = (wid, view_radius)
    insert_item_id.append(id)
    GameEventManager().notify('union_view_item_update', insert_item_id, [])
    return None
