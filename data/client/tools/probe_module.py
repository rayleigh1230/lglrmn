"""确认W13012是否贡献对舰火力(STL=10防空武器)"""
import sys, traceback, json
out = []
try:
    from data.ship_attr_calc import BlueprintAttrCalc
    import common.common_definition as cd
    MA_SHIP_DPS = cd.MA_SHIP_DPS

    calc = BlueprintAttrCalc()
    calc.prepare_by_ship_id(30102)

    # W13012对舰
    ship_w12 = calc.get_weapon_ship_dps(301020102, 13012)
    air_w12 = calc.get_weapon_air_defend_dps(301020102, 13012)
    siege_w12 = calc.get_weapon_destroy_coef_dps(301020102, 13012)
    out.append(f'W13012: ship={ship_w12} air={air_w12} siege={siege_w12}')

    # W13011对舰
    ship_w11 = calc.get_weapon_ship_dps(301020101, 13011)
    out.append(f'W13011: ship={ship_w11}')

    out.append(f'总: ship={calc.get_ship_dps(MA_SHIP_DPS)}')

    # W13012的SPECIAL_TARGET_LOGIC
    from data.ship_attr_calc import Tb_cfg_weapon
    wc = Tb_cfg_weapon.get(13012)
    out.append('W13012 STL=' + str(getattr(wc, 'SPECIAL_TARGET_LOGIC', '?')))

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:1000])
RESULT = json.dumps(out, ensure_ascii=False)
