# Source Generated with Decompyle++
# File: can_user_enter_camp_trade_center.pyc (Python 3.11)

if not sys_param_utils.is_io_season():
    return True
stuff_record = None().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
return stuff_record[UserStuffField.MAX_CITY_LEVEL] >= TradeItemsField.TradeConfig.TRADE_CONFIG_MAX_CITY_LEVEL
