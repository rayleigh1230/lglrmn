# Source Generated with Decompyle++
# File: get_npc_city_belong.pyc (Python 3.11)

record_world_item = GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
if not record_world_item:
    return (None, None)
union_id = None[WorldItemField.UNION_ID]
if not union_id:
    return (None, None)
is_npc_union_id = is_npc_union_id
import data_manager.union.union_utils
if is_npc_union_id(union_id):
    return (union_id, True)
cfg_meta_id = None(item_id)
sub_id_list = get_npc_city_belong_data_set(cfg_meta_id)
if not sub_id_list:
    return (union_id, True)
UnionDataMgr = UnionDataMgr
import data_manager.union.union_data_mgr
UnionDataCtrl = UnionDataCtrl
import data_manager.union.union_data_ctrl
union_data = UnionDataMgr().get_union_data(union_id)
if union_data:
    league_id = union_data.league_id
else:
    league_id = None
    if request:
        UnionDataCtrl().request_union_data(union_id)
sub_belong_npc = []
sub_belong_same_league = []
sub_belong_other_league = []
for sub_meta_id in sub_id_list:
    sub_record_id = get_item_uid_by_meta_cfg_id(sub_meta_id)
    sub_cfg_item = Tb_cfg_meta_world_item.get(sub_record_id)
    if not sub_cfg_item:
        continue
    if sub_cfg_item[Tb_cfg_meta_world_item.ITEM_TYPE] != WorldItemField.Type.TYPE_NPC_DEFENCE_PORT:
        continue
    sub_record_item = GameDataMgr().get_record(TableID.WORLD_ITEM, sub_record_id)
    if not sub_record_item:
        continue
    sub_union_id = sub_record_item[WorldItemField.UNION_ID]
    if sub_union_id or is_npc_union_id(sub_union_id):
        sub_belong_npc.append(sub_union_id)
        continue
    if sub_union_id == union_id:
        sub_belong_same_league.append(sub_union_id)
        continue
    if not league_id:
        sub_belong_other_league.append(sub_union_id)
        continue
    sub_union_data = UnionDataMgr().get_union_data(sub_union_id)
    if sub_union_data:
        sub_league_id = sub_union_data.league_id
    else:
        sub_league_id = None
        if request:
            UnionDataCtrl().request_union_data(union_id)
    if sub_league_id == league_id:
        sub_belong_same_league.append(sub_union_id)
        continue
    sub_belong_other_league.append(sub_union_id)
    if len(sub_belong_same_league) <= 0:
        cfg_world_item = Tb_cfg_meta_world_item.get(cfg_meta_id)
        return (cfg_world_item[Tb_cfg_meta_world_item.UNION_ID], True)
    for sub_union_id in None:
        if sub_union_id != union_id:
            
            return None, (league_id, False)
        return (union_id, True)
