"""重新dump斗牛/侦察机空强化精确值 + 每个武器贡献"""
import sys, traceback, json
out = []
try:
    from data.ship_attr_calc import BlueprintAttrCalc, Tb_cfg_weapon_action
    import common.common_definition as cd
    MA_SHIP_DPS = cd.MA_SHIP_DPS; MA_SHIP_AIR_DPS = cd.MA_SHIP_AIR_DPS; MA_SHIP_DESTROY_COEF_DPS = cd.MA_SHIP_DESTROY_COEF_DPS

    for sid in [40501, 10201]:
        try:
            calc = BlueprintAttrCalc()
            calc.prepare_by_ship_id(sid)
            out.append(f'=== {sid} 空强化 ===')
            out.append(f'  total: ship={calc.get_ship_dps(MA_SHIP_DPS)} air={calc.get_ship_dps(MA_SHIP_AIR_DPS)} siege={calc.get_ship_dps(MA_SHIP_DESTROY_COEF_DPS)}')
            for winfo in calc.cur_modules:
                wid = winfo[0]; sf = winfo[1]
                from data.ship_attr_calc import Tb_cfg_ship_slot
                sd = Tb_cfg_ship_slot.get(sf)
                if not sd or sd[0] not in (1,2): continue
                ship = calc.get_weapon_ship_dps(sf, wid)
                air = calc.get_weapon_air_defend_dps(sf, wid)
                siege = calc.get_weapon_destroy_coef_dps(sf, wid)
                wa = Tb_cfg_weapon_action.get(int(str(wid)+'01'))
                out.append(f'  W{wid}(slot{sf},cat{sd[0]},i{sd[1]}): ship={ship} air={air} siege={siege} act={wa}')
        except Exception as e:
            out.append(f'{sid} ERR: {str(e)[:80]}')

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:1200])
RESULT = json.dumps(out, ensure_ascii=False)
