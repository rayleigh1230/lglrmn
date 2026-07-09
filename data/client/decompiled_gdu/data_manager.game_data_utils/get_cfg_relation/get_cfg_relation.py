# Source Generated with Decompyle++
# File: get_cfg_relation.pyc (Python 3.11)

npc_union_cfg = Tb_cfg_npc_union.get(union_id)
if not npc_union_cfg:
    return None
relation_cfg = None.get(npc_union_cfg[Tb_cfg_npc_union.ORIGIN_ID])
if not relation_cfg:
    return None
if None[Tb_cfg_npc_union_specific_relation.RELATION]:
    return CFG_RELATION_MAP.get(relation_cfg[Tb_cfg_npc_union_specific_relation.RELATION], None)
