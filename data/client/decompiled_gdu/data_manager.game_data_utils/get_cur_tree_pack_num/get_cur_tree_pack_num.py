# Source Generated with Decompyle++
# File: get_cur_tree_pack_num.pyc (Python 3.11)

cur_tree_pack_num = 0
tree_pack_table = GameDataMgr().get_table(TableID.BP_RESEARCH_TREE_PACK)
self_user_id = GameDataMgr().user_id
for record in six.itervalues(tree_pack_table):
    if not record[BpResearchTreePackField.USERID] == self_user_id and record[BpResearchTreePackField.TREE_ID]:
        cur_tree_pack_num += 1
    return cur_tree_pack_num
