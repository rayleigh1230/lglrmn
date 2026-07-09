# Source Generated with Decompyle++
# File: get_user_paid_vip_level.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_ENTERPRISE_WECHAT, GameDataMgr().user_id)
if not record:
    return common_definition.VipLevel.NONE
rmb_paid = None[UserEnterpriseWechatField.RECHARGE_OF_THE_YEAR]
vip_level = common_definition.VipLevel.NONE
for level_border in configdata.SPARKLY_TIPS_LEVEL:
    if rmb_paid >= level_border:
        vip_level += 1
    return vip_level
