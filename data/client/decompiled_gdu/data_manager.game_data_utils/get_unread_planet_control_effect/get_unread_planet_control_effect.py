# Source Generated with Decompyle++
# File: get_unread_planet_control_effect.pyc (Python 3.11)

uid_list = []
record_dict = GameDataMgr().get_table(TableID.PLANET_CONTROL_EFFECT)
for _, record in list(record_dict.items()):
    effect_type = record[PlanetControlEffectField.EFFECT_TYPE]
    type_cfg = PlanetEffectTypeCfg.get(effect_type)
    if classify_type != type_cfg[PlanetEffectTypeCfgField.CLASSIFY]:
        continue
    if team_id == record[PlanetControlEffectField.LANDING_TEAM_ID]:
        continue
    if record[PlanetControlEffectField.READ] == PlanetControlEffectField.Read.READ_NO:
        uid_list.append(record[PlanetControlEffectField.ID])
    return uid_list
