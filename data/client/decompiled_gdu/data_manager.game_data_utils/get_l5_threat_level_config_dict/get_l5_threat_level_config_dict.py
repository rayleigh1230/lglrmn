# Source Generated with Decompyle++
# File: get_l5_threat_level_config_dict.pyc (Python 3.11)

result = {
    'model_file': None,
    'desc_level': language.L5_THREAT_TEAM_LEVEL_0,
    'buff_icon': '' }
SIGN_MODEL = SIGN_MODEL
import strategy.team.l5_threat_team_sign
if level >= configdata.RED_NAME_MARK_RISK_THRESHOLD[0]:
    result['model_file'] = SIGN_MODEL[2]
    result['desc_level'] = language.L5_THREAT_TEAM_LEVEL_2
    result['buff_icon'] = ui_res.ICON_BUFF_IN_THREAT_2
elif level >= configdata.RED_NAME_MARK_RISK_THRESHOLD[1]:
    result['model_file'] = SIGN_MODEL[1]
    result['desc_level'] = language.L5_THREAT_TEAM_LEVEL_1
    result['buff_icon'] = ui_res.ICON_BUFF_IN_THREAT_1
elif level >= configdata.RED_NAME_MARK_RISK_THRESHOLD[2]:
    result['model_file'] = SIGN_MODEL[0]
    result['desc_level'] = language.L5_THREAT_TEAM_LEVEL_0
    result['buff_icon'] = ui_res.ICON_BUFF_IN_THREAT_0
return result
