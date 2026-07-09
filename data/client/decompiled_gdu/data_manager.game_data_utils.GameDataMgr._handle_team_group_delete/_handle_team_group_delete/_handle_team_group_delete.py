# Source Generated with Decompyle++
# File: _handle_team_group_delete.pyc (Python 3.11)

for _, team_id, _ in grouped_data:
    node = self.all_team_record_node_dict.pop(team_id, None)
    if node:
        self.all_team_record_list.remove(node)
    return None
