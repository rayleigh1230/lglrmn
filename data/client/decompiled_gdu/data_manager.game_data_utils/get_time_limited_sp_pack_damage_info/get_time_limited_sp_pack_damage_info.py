# Source Generated with Decompyle++
# File: get_time_limited_sp_pack_damage_info.pyc (Python 3.11)

Tb_cfg_bp_research_tree_node = Tb_cfg_bp_research_tree_node
import common.config.db
CfgBpResearchTreeNodeField = CfgBpResearchTreeNodeField
import common.config.table_definition
RESEARCH_LEAF_NODE_DATA = RESEARCH_LEAF_NODE_DATA
RESEARCH_NODE_DATA = RESEARCH_NODE_DATA
import common.preprocess_data
ship_bp_fragment_utils = ship_bp_fragment_utils
import data_manager
damage_level = 0
bp_fragment_cfg_id = 0
bp_fragment_img_path = ''
if not sp_pack_id:
    return (damage_level, bp_fragment_cfg_id, bp_fragment_img_path)
feature_id_info = None(sp_pack_id)
if feature_id_info and CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE_BETAL in list(feature_id_info.keys()):
    tree_id_list = feature_id_info[CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE_BETAL]
    show_damage_level = False
elif not feature_id_info or CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE in list(feature_id_info.keys()):
    return (damage_level, bp_fragment_cfg_id, bp_fragment_img_path)
tree_id_list = feature_id_info[CfgBpPackFeatureField.Feature.FEATURE_SPECIFIED_TREE]
show_damage_level = True

def get_damage_level(parent_node_id = None, tree_index = None, depth = None):
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

if tree_id_list:
    (damage_level, bp_fragment_cfg_id, bp_fragment_img_path) = get_damage_level(tree_id_list[0] * 1000, 0, 0)
return (damage_level if show_damage_level else 0, bp_fragment_cfg_id, bp_fragment_img_path)
