"""FG300火力明细dump: 用prepare_by_ship_id + 逐项中间值"""
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

    var pyCode = [
        "import sys, traceback, json",
        "out = []",
        "try:",
        "    from data.ship_attr_calc import BlueprintAttrCalc",
        "    import common.common_definition as cd",
        "    MA_SHIP_DPS = cd.MA_SHIP_DPS; MA_SHIP_AIR_DPS = cd.MA_SHIP_AIR_DPS; MA_SHIP_DESTROY_COEF_DPS = cd.MA_SHIP_DESTROY_COEF_DPS",
        "    MA_MODULE_DPS = cd.MA_MODULE_DPS; MA_MODULE_AIR_DPS = cd.MA_MODULE_AIR_DPS; MA_MODULE_COEF_DPS = cd.MA_MODULE_COEF_DPS",
        "",
        "    calc = BlueprintAttrCalc()",
        "    calc.prepare_by_ship_id(30101)",
        "    # 总火力(确认锚点)",
        "    out.append('TOTAL: ship=' + str(calc.get_ship_dps(MA_SHIP_DPS)) + ' air=' + str(calc.get_ship_dps(MA_SHIP_AIR_DPS)) + ' siege=' + str(calc.get_ship_dps(MA_SHIP_DESTROY_COEF_DPS)))",
        "",
        "    # 单武器DPS(主炮13011, 槽3010101)",
        "    out.append('=== 单武器 13011 ===')",
        "    slot_id = '3010101'; module_id = '13011'",
        "    for dps_type, label in [(MA_SHIP_DPS,'ship'),(MA_SHIP_AIR_DPS,'air'),(MA_SHIP_DESTROY_COEF_DPS,'siege')]:",
        "        try:",
        "            v = calc.get_weapon_ship_dps(slot_id, module_id) if label=='ship' else (calc.get_weapon_air_defend_dps(slot_id, module_id) if label=='air' else calc.get_weapon_destroy_coef_dps(slot_id, module_id))",
        "            out.append('  weapon_' + label + '_dps=' + str(v))",
        "        except Exception as e: out.append('  ' + label + ' ERR: ' + str(e)[:100])",
        "",
        "    # 逐项中间值(attack/cd/duration/dph)",
        "    out.append('=== 逐项中间值 ===')",
        "    # 先看get_weapon_dps_dph(dps_type) - 单武器单发伤害",
        "    try:",
        "        for dps_type, label in [(MA_SHIP_DPS,'ship'),(MA_SHIP_AIR_DPS,'air'),(MA_SHIP_DESTROY_COEF_DPS,'siege')]:",
        "            dph = calc.get_weapon_dps_dph(slot_id, module_id, dps_type)",
        "            out.append('  dph(' + label + ')=' + str(dph))",
        "    except Exception as e: out.append('  dph ERR: ' + str(e)[:100])",
        "",
        "    # attack / cd / duration",
        "    try:",
        "        # weapon_action_id 可能需要int",
        "        for waid in ['1301101', 1301101]:",
        "            try:",
        "                atk = calc.get_weapon_attack(slot_id, module_id, waid, MA_SHIP_DPS)",
        "                out.append('  weapon_attack(waid=' + str(waid) + ')=' + str(atk))",
        "                break",
        "            except Exception as e:",
        "                out.append('  attack(waid=' + str(waid) + ') ERR: ' + str(e)[:80])",
        "        cd_ = calc.get_weapon_cd_time(slot_id, module_id, MA_SHIP_DPS)",
        "        out.append('  weapon_cd_time=' + str(cd_))",
        "        dur = calc.get_weapon_duration_time(slot_id, module_id, '1301101', MA_SHIP_DPS)",
        "        out.append('  weapon_duration_time=' + str(dur))",
        "    except Exception as e: out.append('  mid ERR: ' + str(e)[:100])",
        "",
        "    # 用calc表达式看公式",
        "    out.append('=== 计算表达式 ===')",
        "    try:",
        "        calc_obj = calc.get_weapon_ship_dps_calc(slot_id, module_id)",
        "        out.append('  calc type=' + str(type(calc_obj).__name__))",
        "        if hasattr(calc_obj, 'calculate_full'):",
        "            out.append('  calculate_full=' + str(calc_obj.calculate_full()))",
        "        if hasattr(calc_obj, 'cur_expression'):",
        "            out.append('  expression=' + str(calc_obj.cur_expression))",
        "        if hasattr(calc_obj, 'get_expression'):",
        "            exp_ = calc_obj.get_expression()",
        "            out.append('  get_expression=' + str(exp_)[:500])",
        "        # named_diffs 绑定值",
        "        for attr in ['_named_diffs','named_diffs','_diffs','bind_values','_bind']:",
        "            if hasattr(calc_obj, attr):",
        "                v = getattr(calc_obj, attr)",
        "                out.append('  ' + attr + '=' + str(v)[:500])",
        "    except Exception as e: out.append('  exp ERR: ' + str(e)[:120])",
        "",
        "    # INSTALL_NUM 和 ANTIAIRCRAFT_RATIO",
        "    out.append('=== INSTALL_NUM / ANTIAIRCRAFT_RATIO ===')",
        "    try:",
        "        from data.ship_attr_calc import Tb_cfg_ship_slot",
        "        sd = Tb_cfg_ship_slot.get('301010101')",
        "        out.append('  slot 301010101=' + repr(sd))",
        "        if sd: out.append('  fields=' + str([x for x in dir(sd) if not x.startswith('_')])[:300])",
        "    except Exception as e: out.append('  slot ERR: ' + str(e)[:100])",
        "",
        "    # air_ratio防空比例",
        "    out.append('=== get_air_defend_fixed_hit_rate ===')",
        "    try:",
        "        hr = calc.get_air_defend_fixed_hit_rate(slot_id, module_id)",
        "        out.append('  fixed_hit_rate=' + str(hr))",
        "    except Exception as e: out.append('  hit_rate ERR: ' + str(e)[:80])",
        "",
        "except Exception:",
        "    out.append('TOPERR=' + traceback.format_exc()[:2000])",
        "_probe_out = json.dumps(out, ensure_ascii=False)",
    ].join("\n");

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
