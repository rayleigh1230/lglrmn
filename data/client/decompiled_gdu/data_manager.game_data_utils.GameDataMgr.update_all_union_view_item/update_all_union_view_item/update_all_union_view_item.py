# Source Generated with Decompyle++
# File: update_all_union_view_item.pyc (Python 3.11)

new_union_view_item_dict = { }
insert_item_id = []
remove_item_id = []
view_item_len = 3
view_item_num = len(data) / view_item_len
for i in range(view_item_num):
    id = data[i * view_item_len + 0]
    wid = data[i * view_item_len + 1]
    view_radius = data[i * view_item_len + 2]
    new_union_view_item_dict[id] = (wid, view_radius)
    for id in list(self.union_view_item_dict.keys()):
        if id not in new_union_view_item_dict:
            remove_item_id.append(id)
        for id in list(new_union_view_item_dict.keys()):
            if id not in self.union_view_item_dict:
                insert_item_id.append(id)
            self.union_view_item_dict = new_union_view_item_dict
            GameEventManager().notify('union_view_item_update', insert_item_id, remove_item_id)
            return None
