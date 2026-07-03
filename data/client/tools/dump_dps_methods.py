"""
深度dump: 火力公式方法体 + 调校模块 + 巅峰官方算法

目标:
1. dump get_ship_dps_calc / get_weapon_ship_dps_calc / get_weapon_dps_dph_calc 的 co_names/co_consts
2. dump get_weapon_destroy_coef_dps_calc / get_weapon_air_defend_dps_calc (攻城/防空)
3. dump ui.ship_blueprint_module_adjust (调校系统)
4. dump get_peak_effect_info_by_peak_level (巅峰官方算法)
5. 探测常量 C_BASE_NUM / C_RATIO / V_* 的值
"""
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

    function dump_code(out, obj, label, prefix) {
        out.push(prefix + "CODE " + label + ":");
        try {
            var func = obj;
            if (hasattr_obj(obj, '__func__')) func = obj.__func__;
            var co = func.__code__;
            out.push(prefix + "  co_names=" + JSON.stringify(co.co_names));
            out.push(prefix + "  co_consts=" + JSON.stringify(co.co_consts).substring(0, 800));
            out.push(prefix + "  co_varnames=" + JSON.stringify(co.co_varnames).substring(0, 400));
            out.push(prefix + "  argcount=" + co.co_argcount);
        } catch(e) { out.push(prefix + "  ERR " + str(e).substring(0,100)); }
    }

    var pyCode = [
        "import sys, traceback, json, types, dis",
        "out = []",
        "def hasattr_obj(o, n):",
        "    try: return hasattr(o, n)",
        "    except: return False",
        "def str_(o):",
        "    try: return str(o)",
        "    except: return '???'",
        "try:",
        "    import data.ship_attr_calc as sac",
        "    cls = sac.BlueprintAttrCalc",
        "",
        "    # ===== 1. dump 火力公式方法体 =====",
        "    out.append('===== FIREPOWER METHODS =====')",
        "    target_methods = [",
        "        'get_ship_dps_calc', 'get_ship_dps',",
        "        'get_weapon_ship_dps_calc', 'get_weapon_ship_dps',",
        "        'get_weapon_dps_dph_calc', 'get_weapon_dps_dph',",
        "        'get_weapon_destroy_coef_dps_calc', 'get_weapon_destroy_coef_dps',",
        "        'get_weapon_air_defend_dps_calc', 'get_weapon_air_defend_dps',",
        "        'get_weapon_attack_calc', 'get_weapon_attack',",
        "        'get_weapon_cd_time_calc', 'get_weapon_cd_time',",
        "        'get_weapon_duration_time_calc',",
        "        'get_module_total_dps_calc',",
        "    ]",
        "    for mname in target_methods:",
        "        if hasattr(cls, mname):",
        "            m = getattr(cls, mname)",
        "            out.append('METHOD ' + mname + ':')",
        "            try:",
        "                func = m.__func__ if hasattr(m, '__func__') else m",
        "                co = func.__code__",
        "                out.append('  co_names=' + json.dumps(co.co_names))",
        "                out.append('  co_consts=' + json.dumps(co.co_consts)[:800])",
        "                out.append('  co_varnames=' + json.dumps(co.co_varnames)[:400])",
        "                out.append('  argcount=' + str(co.co_argcount))",
        "            except Exception as e: out.append('  ERR ' + str(e)[:100])",
        "",
        "    # ===== 2. dump 模块级常量 =====",
        "    out.append('===== CONSTANTS =====')",
        "    for cname in ['C_BASE_NUM','C_RATIO','V_ATTACK','V_TOTAL_HURT','V_ATK_INTERVAL','V_ADDITIONAL_DPS_DPH','V_ACTION_TIMES','V_DURATION','V_REPEAT_TIMES','V_ADD_DPS','V_ADD_NUM','V_ADD_RATIO','V_ADD_BASE_NUM']:",
        "        if hasattr(sac, cname):",
        "            out.append(cname + ' = ' + repr(getattr(sac, cname)))",
        "",
        "    # ===== 3. CalculationConstant 类(核心公式常量) =====",
        "    if hasattr(sac, 'CalculationConstant'):",
        "        cc = sac.CalculationConstant",
        "        out.append('CalculationConstant attrs: ' + str([x for x in dir(cc) if not x.startswith('_')]))",
        "        for a in dir(cc):",
        "            if not a.startswith('_'):",
        "                try:",
        "                    v = getattr(cc, a)",
        "                    if not callable(v): out.append('  CC.' + a + ' = ' + repr(v))",
        "                except: pass",
        "",
        "    # ===== 4. EffectId 类(EFFECT_ID映射) =====",
        "    if hasattr(sac, 'EffectId'):",
        "        ei = sac.EffectId",
        "        out.append('EffectId attrs: ' + str([x for x in dir(ei) if not x.startswith('_')])[:500])",
        "",
        "    # ===== 5. 巅峰官方算法 =====",
        "    out.append('===== PEAK OFFICIAL =====')",
        "    for fn in ['get_peak_effect_info_by_effect_str','get_peak_effect_info_by_peak_level','get_peak_effects_add']:",
        "        if hasattr(sac, fn):",
        "            f = getattr(sac, fn)",
        "            out.append('FUNC ' + fn + ':')",
        "            try:",
        "                co = f.__code__",
        "                out.append('  co_names=' + json.dumps(co.co_names))",
        "                out.append('  co_consts=' + json.dumps(co.co_consts)[:500])",
        "            except Exception as e: out.append('  ERR ' + str(e)[:80])",
        "",
        "    # ===== 6. 调校系统 ui.ship_blueprint_module_adjust =====",
        "    out.append('===== TUNE SYSTEM =====')",
        "    try:",
        "        import ui.ship_blueprint_module_adjust as tune_mod",
        "        out.append('TUNE module loaded')",
        "        attrs = [x for x in dir(tune_mod) if not x.startswith('_')]",
        "        out.append('TUNE_ATTRS: ' + str(attrs)[:600])",
        "        # dump 关键类/函数",
        "        for a in attrs:",
        "            obj = getattr(tune_mod, a)",
        "            if isinstance(obj, type):",
        "                out.append('TUNE_CLASS ' + a + ': methods=' + str([m for m in dir(obj) if not m.startswith('_')])[:400])",
        "            elif callable(obj) and hasattr(obj, '__code__'):",
        "                co = obj.__code__",
        "                out.append('TUNE_FUNC ' + a + ': co_names=' + json.dumps(co.co_names)[:300])",
        "    except Exception as e: out.append('TUNE_ERR: ' + str(e)[:150])",
        "",
        "    # ===== 7. 调校表 Tb_cfg_system_skill (可能含调校定义) =====",
        "    try:",
        "        import common.config.db as db",
        "        # 找所有含 adjust/enhance/skill 的表",
        "        for tbl_name in sorted(dir(db)):",
        "            tl = tbl_name.lower()",
        "            if any(k in tl for k in ['adjust','tune','calibrat','overclock']):",
        "                tbl = getattr(db, tbl_name)",
        "                if hasattr(tbl, 'get_all_data'):",
        "                    d = tbl.get_all_data()",
        "                    out.append('ADJUST_TABLE ' + tbl_name + ': ' + str(len(d)) + ' records')",
        "                    for k,v in list(d.items())[:2]:",
        "                        out.append('  sample ' + str(k) + ': ' + repr(v)[:200])",
        "    except Exception as e: out.append('ADJUST_TBL_ERR: ' + str(e)[:100])",
        "",
        "except Exception:",
        "    out.append('TOPERR=' + traceback.format_exc())",
        "_probe_out = json.dumps(out, ensure_ascii=False)",
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil = Ens();
    var rc = Run(code);
    log.push("rc=" + rc);
    if (rc == 0) {
        var mod = AddM(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = GetA(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = Str(v);
                var cs = UTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
            }
        }
    }
    Rel(gil);
} catch(e) {
    log.push("JSERR=" + e + " stack=" + (e.stack||""));
}
send(JSON.stringify(log));
"""

done = [False]
res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"])
        done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description", "") + " | " + m.get("stack", ""))
        done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid:
    print("NO_GAME")
    exit()
print("attach", pid[0], "...")
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg)
s.load()
for _ in range(40):
    if done[0]:
        break
    time.sleep(0.3)

try:
    lines = json.loads(res[0])
    for line in lines:
        if line.startswith("PYRESULT="):
            pyresult = json.loads(line[9:])
            for item in pyresult:
                print("  " + item)
        else:
            print(line)
except Exception as e:
    print("parse err:", e)
    for r in res:
        print(r)
