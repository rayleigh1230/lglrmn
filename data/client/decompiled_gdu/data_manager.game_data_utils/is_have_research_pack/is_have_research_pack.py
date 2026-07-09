# Source Generated with Decompyle++
# File: is_have_research_pack.pyc (Python 3.11)

bp_research_tree_pack_table = GameDataMgr().get_table(TableID.BP_RESEARCH_TREE_PACK)
is_have = False
if len(bp_research_tree_pack_table) <= 0:
    return is_have
