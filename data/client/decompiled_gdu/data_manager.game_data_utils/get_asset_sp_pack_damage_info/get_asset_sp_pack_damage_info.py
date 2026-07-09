# Source Generated with Decompyle++
# File: get_asset_sp_pack_damage_info.pyc (Python 3.11)

cfg_pack = Tb_cfg_asset_pack_sp.get(sp_pack_id)
if not cfg_pack:
    return (0, { })
data = None[Tb_cfg_asset_pack_sp.FEATURE]
feature_data = { }
damage = 0
for x in parse_cfg_str_to_list_of_list(data, is_num = True):
    if len(x) == 1:
        feature_data[x[0]] = None
        continue
    if len(x) == 2:
        feature_data[x[0]] = x[1]
        if x[0] == CfgAssetPackFeatureField.Feature.FEATURE_BREAK_DOWN:
            damage = x[1]
        continue
    feature_data[x[0]] = x[1:]
    return (damage, feature_data)
