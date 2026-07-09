# Source Generated with Decompyle++
# File: get_damage_level.pyc (Python 3.11)

tree_id = tree_id_list[tree_index]
parent_tree_node_id = parent_node_id % common_config.TREE_INDEX_OFFSET
children_nodes_ids = RESEARCH_NODE_DATA.get(parent_tree_node_id, [])
if RESEARCH_LEAF_NODE_DATA.get(tree_id)[0] == parent_tree_node_id and len(children_nodes_ids) == 0 and tree_index < len(tree_id_list) - 1:
    tree_index += 1
    tree_id = tree_id_list[tree_index]
    children_nodes_ids = RESEARCH_NODE_DATA.get(tree_id * 1000, [])
depth += 1
for tree_node_id in children_nodes_ids:
    node_config = Tb_cfg_bp_research_tree_node.get(tree_node_id)
    if node_config and node_config[Tb_cfg_bp_research_tree_node.NODE_TYPE] == CfgBpResearchTreeNodeField.Type.TYPE_SHIP_BLUEPRINT_FRAGMENT:
        bp_fragment_cfg_id = node_config[Tb_cfg_bp_research_tree_node.REWARD]
        
        return None, (depth, bp_fragment_cfg_id, ship_bp_fragment_utils.get_fragment_icon(bp_fragment_cfg_id))
    for child_depth, cfg_id, img_path in children_nodes_ids:
        if child_depth != 0:
            
            return None, (child_depth, cfg_id, img_path)
        return (0, 0, '')
