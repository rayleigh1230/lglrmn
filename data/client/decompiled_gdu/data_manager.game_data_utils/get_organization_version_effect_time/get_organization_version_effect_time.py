# Source Generated with Decompyle++
# File: get_organization_version_effect_time.pyc (Python 3.11)

organization_version_effect_time = configdata.ORGANIZATION_VERSION_EFFECT_TIME if common_config.get_game_region() == common_config.REGION_CHINA else configdata.ORGANIZATION_VERSION_EFFECT_TIME_GB
return organization_version_effect_time
