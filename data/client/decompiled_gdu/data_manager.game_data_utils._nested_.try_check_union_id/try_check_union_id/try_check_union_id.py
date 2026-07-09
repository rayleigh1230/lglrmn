# Source Generated with Decompyle++
# File: try_check_union_id.pyc (Python 3.11)

if union_id in force_id_dict:
    return force_id_dict.get(union_id) == L0RegionForceId.GREEN_REGION_FORCE_ID
npc_union_cfg = None.get(union_id)
if not npc_union_cfg:
    return False
force_id = None[Tb_cfg_npc_union.ORIGIN_ID]
force_id_dict[union_id] = force_id
return force_id == L0RegionForceId.GREEN_REGION_FORCE_ID
