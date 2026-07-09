# Source Generated with Decompyle++
# File: get_user_vip_level_name.pyc (Python 3.11)

vip_level = get_user_paid_vip_level()
vip_name_dic = {
    common_definition.VipLevel.NORMAL: language.VIP_LEVEL_NAME_2,
    common_definition.VipLevel.SMALL: language.VIP_LEVEL_NAME_1,
    common_definition.VipLevel.NONE: None }
return vip_name_dic[vip_level]
