# Source Generated with Decompyle++
# File: get_user_research_pack_num.pyc (Python 3.11)

cur_research_pack_num = 0
pack_table = GameDataMgr().get_table(TableID.BP_RESEARCH_TREE_PACK)
self_user_id = GameDataMgr().user_id
for record in six.itervalues(pack_table):
    if record[BpResearchTreePackField.USERID] == self_user_id:
        cur_research_pack_num += 1
    return cur_research_pack_num
