"""公式还原: monkeypatch拦截单武器计算,记录attack/cd/times/air_ratio"""
import frida, time, json

JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }
    var Ens = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var Rel = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var Run = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var AddM = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var GetA = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var UTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    // 全新Python文件式代码,避免全局污染
    var pyCode = `import sys, traceback, json
out = []
try:
    from data.ship_attr_calc import BlueprintAttrCalc, AttrCalcBase
    import common.common_definition as cd
    MA_SHIP_DPS = cd.MA_SHIP_DPS
    MA_SHIP_AIR_DPS = cd.MA_SHIP_AIR_DPS
    MA_SHIP_DESTROY_COEF_DPS = cd.MA_SHIP_DESTROY_COEF_DPS

    calc = BlueprintAttrCalc()
    calc.prepare_by_ship_id(30101)

    # FG300主炮: cur_modules[0] = (13011, 301010101)
    # slot_full=301010101, 取7位=3010101
    weapon_id = '13011'
    slot_full = '301010101'

    # get_ship_dps内部用 cur_modules 遍历, 每个module_info解包
    # 看get_weapon_ship_dps的参数: 从co_varnames=[self, slot_id, module_id, ...]
    # slot_id就是7位
    slot_id = slot_full[:7]  # 3010101

    out.append('=== 单武器DPS(用7位slot) ===')
    # 对舰
    ship_dps = calc.get_weapon_ship_dps(slot_id, weapon_id)
    out.append('weapon_ship_dps(' + slot_id + ',' + weapon_id + ')=' + str(ship_dps))
    air_dps = calc.get_weapon_air_defend_dps(slot_id, weapon_id)
    out.append('weapon_air_dps=' + str(air_dps))
    siege_dps = calc.get_weapon_destroy_coef_dps(slot_id, weapon_id)
    out.append('weapon_siege_dps=' + str(siege_dps))

    # 总火力确认
    out.append('total ship=' + str(calc.get_ship_dps(MA_SHIP_DPS)))

    # ===== 中间值: get_weapon_dps_dph =====
    out.append('=== get_weapon_dps_dph(单发伤害) ===')
    for dt, lb in [(MA_SHIP_DPS,'ship'),(MA_SHIP_AIR_DPS,'air'),(MA_SHIP_DESTROY_COEF_DPS,'siege')]:
        try:
            dph = calc.get_weapon_dps_dph(slot_id, weapon_id, dt)
            out.append('  dph(' + lb + ')=' + str(dph))
        except Exception as e:
            out.append('  dph(' + lb + ') ERR: ' + str(e)[:80])

    # ===== get_weapon_attack =====
    out.append('=== get_weapon_attack ===')
    # co_varnames=[self, slot_id, module_id, weapon_action_id, dps_type]
    for waid in ['1301101', 1301101]:
        try:
            atk = calc.get_weapon_attack(slot_id, weapon_id, waid, MA_SHIP_DPS)
            out.append('  attack(ship, waid=' + str(waid) + ')=' + str(atk))
        except Exception as e:
            out.append('  attack(waid=' + str(waid) + ') ERR: ' + str(e)[:80])

    # ===== get_weapon_base_value 看action[2]怎么取 =====
    out.append('=== get_weapon_base_value / get_weapon_action_base_value ===')
    try:
        bv = calc.get_weapon_base_value(slot_id, weapon_id, MA_SHIP_DPS)
        out.append('  base_value(ship)=' + str(bv))
    except Exception as e:
        out.append('  base_value ERR: ' + str(e)[:80])
    try:
        abv = calc.get_weapon_action_base_value(slot_id, weapon_id, '1301101', MA_SHIP_DPS)
        out.append('  action_base_value=' + str(abv))
    except Exception as e:
        out.append('  action_base ERR: ' + str(e)[:80])

    # ===== monkeypatch 关键方法拦截计算过程 =====
    out.append('=== monkeypatch get_weapon_attack_calc ===')
    orig_attack = AttrCalcBase.get_weapon_attack_calc
    captured = []
    def patched_attack(self, slot_id, module_id, weapon_action_id, dps_type):
        result = orig_attack(self, slot_id, module_id, weapon_action_id, dps_type)
        captured.append(('attack', slot_id, module_id, weapon_action_id, str(dps_type), result))
        return result
    AttrCalcBase.get_weapon_attack_calc = patched_attack

    orig_cd = AttrCalcBase.get_weapon_cd_time_calc
    def patched_cd(self, slot_id, module_id, dps_type):
        result = orig_cd(self, slot_id, module_id, dps_type)
        captured.append(('cd', slot_id, module_id, str(dps_type), result))
        return result
    AttrCalcBase.get_weapon_cd_time_calc = patched_cd

    orig_dur = AttrCalcBase.get_weapon_duration_time_calc
    def patched_dur(self, slot_id, module_id, weapon_action_id, dps_type):
        result = orig_dur(self, slot_id, module_id, weapon_action_id, dps_type)
        captured.append(('dur', slot_id, module_id, weapon_action_id, str(dps_type), result))
        return result
    AttrCalcBase.get_weapon_duration_time_calc = patched_dur

    # 触发计算
    calc.get_ship_dps(MA_SHIP_DPS)
    out.append('  captured:')
    for c in captured[:20]:
        out.append('    ' + str(c))

    # 还原
    AttrCalcBase.get_weapon_attack_calc = orig_attack
    AttrCalcBase.get_weapon_cd_time_calc = orig_cd
    AttrCalcBase.get_weapon_duration_time_calc = orig_dur

except Exception:
    out.append('TOPERR=' + traceback.format_exc()[:2000])
_probe_out = json.dumps(out, ensure_ascii=False)
`;

    var code = Memory.allocUtf8String(pyCode);
    var gil = Ens(); var rc = Run(code); log.push("rc=" + rc);
    if (rc == 0) {
        var mod = AddM(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = GetA(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) { var st = Str(v); var cs = UTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String()); }
        }
    }
    Rel(gil);
} catch(e) { log.push("JSERR=" + e); }
send(JSON.stringify(log));
"""

done=[False]; res=[]
def on_msg(m,d):
    if m["type"]=="send": res.append(m["payload"]); done[0]=True
    elif m["type"]=="error": res.append("JSERR:"+m.get("description","")); done[0]=True

pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach",pid[0],"...")
s=frida.attach(pid[0]).create_script(JS); s.on('message',on_msg); s.load()
for _ in range(40):
    if done[0]: break
    time.sleep(0.3)
try:
    for line in json.loads(res[0]):
        if line.startswith("PYRESULT="):
            for item in json.loads(line[9:]): print("  "+item)
        else: print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r)
