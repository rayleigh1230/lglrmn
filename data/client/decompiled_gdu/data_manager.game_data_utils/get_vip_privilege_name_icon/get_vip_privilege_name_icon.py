# Source Generated with Decompyle++
# File: get_vip_privilege_name_icon.pyc (Python 3.11)

privilege_name_dic = {
    common_definition.VipPrivilege.FEED_BACK: language.VIP_PRIVILEGE_FEEDBACK,
    common_definition.VipPrivilege.SERVICER_2: language.VIP_PRIVILEGE_SERVICER_2,
    common_definition.VipPrivilege.SERVICER_1: language.VIP_PRIVILEGE_SERVICER_1,
    common_definition.VipPrivilege.FESTIVAL_GIFT: language.VIP_PRIVILEGE_FESTIVAL_GIFT,
    common_definition.VipPrivilege.RES_LOG: language.VIP_PRIVILEGE_RES_LOG,
    common_definition.VipPrivilege.DATA_BACK: language.VIP_PRIVILEGE_DATA_BACK }
privilege_icon_dic = {
    common_definition.VipPrivilege.FEED_BACK: ui_res.VIP_PRIVILEGE_FEED_BACK_ICON,
    common_definition.VipPrivilege.SERVICER_2: ui_res.VIP_PRIVILEGE_SERVICER_ICON,
    common_definition.VipPrivilege.SERVICER_1: ui_res.VIP_PRIVILEGE_SERVICER_ICON,
    common_definition.VipPrivilege.FESTIVAL_GIFT: ui_res.VIP_PRIVILEGE_FESTIVAL_GIFT_ICON,
    common_definition.VipPrivilege.RES_LOG: ui_res.VIP_PRIVILEGE_RES_LOG_ICON,
    common_definition.VipPrivilege.DATA_BACK: ui_res.VIP_PRIVILEGE_DATA_BACK_ICON }
return (privilege_name_dic[privilege], privilege_icon_dic[privilege])
