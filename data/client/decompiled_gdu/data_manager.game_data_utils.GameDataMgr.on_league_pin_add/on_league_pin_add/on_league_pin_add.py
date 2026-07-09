# Source Generated with Decompyle++
# File: on_league_pin_add.pyc (Python 3.11)

for data in datas:
    mark_ids = self.league_mark_list()
    if data['id'] not in mark_ids:
        self.league_mark_list.append(data)
    return None
