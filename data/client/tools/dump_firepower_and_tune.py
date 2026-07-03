"""
综合探测脚本: 火力计算模块 + 调校系统

目标1: dump data.ship_attr_calc 模块的方法签名和co_names/co_consts
       重点是 get_ship_dps_calc / get_weapon_total_dps / get_module_total_dps
目标2: 探测调校系统运行时数据
       确认 optIdx=31-43 的10级上限来源,以及三步链(永久加成→消费→调校)

注入方式: 复用 inject_probe3.py 的 frida 17 正确API通道
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

    var pyCode = [
        "import sys, traceback, json, types",
        "out = []",
        "try:",
        "    # ===== 目标1: 火力计算模块 =====",
        "    import importlib",
        "    # 尝试多种可能的模块名",
        "    fire_mods = [",
        "        'data.ship_attr_calc',",
        "        'data.ship.ship_attr_calc',",
        "        'data.ship.ship_utils',",
        "        'common.battle.ship_attr_calc',",
        "        'data.battle.ship_attr_calc',",
        "    ]",
        "    fire_found = None",
        "    for mname in fire_mods:",
        "        try:",
        "            importlib.import_module(mname)",
        "            out.append('FOUND_MODULE: ' + mname)",
        "            fire_found = mname",
        "            break",
        "        except Exception as e:",
        "            out.append('no ' + mname + ': ' + str(e)[:60])",
        "",
        "    if fire_found:",
        "        mod = sys.modules[fire_found]",
        "        # 列出所有类",
        "        classes = [x for x in dir(mod) if not x.startswith('_')]",
        "        out.append('MODULE_ATTRS: ' + str(classes))",
        "        # 找 BlueprintAttrCalc 类",
        "        for cname in ['BlueprintAttrCalc','ShipAttrCalc','AttrCalc']:",
        "            if hasattr(mod, cname):",
        "                cls = getattr(mod, cname)",
        "                out.append('CLASS: ' + cname)",
        "                methods = [m for m in dir(cls) if not m.startswith('_')]",
        "                out.append('  methods: ' + str(methods))",
        "                # dump 每个dps相关方法的co_names/co_consts",
        "                for mname in methods:",
        "                    if 'dps' in mname.lower() or 'fire' in mname.lower() or 'weapon' in mname.lower():",
        "                        try:",
        "                            m = getattr(cls, mname)",
        "                            if hasattr(m, '__func__'):",
        "                                co = m.__func__.__code__",
        "                                out.append('  METHOD ' + mname + ':')",
        "                                out.append('    co_names=' + str(co.co_names))",
        "                                out.append('    co_consts=' + str(co.co_consts)[:500])",
        "                                out.append('    argcount=' + str(co.co_argcount))",
        "                        except Exception as e:",
        "                            out.append('  METHOD ' + mname + ' ERR: ' + str(e)[:80])",
        "                break",
        "",
        "    # ===== 目标2: 调校系统探测 =====",
        "    out.append('--- TUNE SYSTEM PROBE ---')",
        "    # 找调校相关模块",
        "    tune_keywords = ['tune','calibrat','adjust','overclock','refine']",
        "    tune_mods = []",
        "    for mname in list(sys.modules.keys()):",
        "        ml = mname.lower()",
        "        if any(k in ml for k in tune_keywords):",
        "            tune_mods.append(mname)",
        "    out.append('TUNE_MODULES_LOADED: ' + str(tune_mods[:20]))",
        "",
        "    # 查 system_enhance 表里 optIdx=31-43 的完整记录",
        "    try:",
        "        import common.config.db as db",
        "        # 尝试找 enhance 表",
        "        for tbl_name in dir(db):",
        "            if 'enhance' in tbl_name.lower():",
        "                tbl = getattr(db, tbl_name)",
        "                if hasattr(tbl, 'get_all_data'):",
        "                    data = tbl.get_all_data()",
        "                    out.append('TABLE ' + tbl_name + ': ' + str(len(data)) + ' records')",
        "                    # 看一条 optIdx=31 的记录",
        "                    for k, v in list(data.items())[:5]:",
        "                        try:",
        "                            ks = list(v.keys()) if hasattr(v,'keys') else 'nokeys'",
        "                            out.append('  sample ' + str(k) + ': ' + str(ks)[:200])",
        "                        except: pass",
        "                    break",
        "    except Exception as e:",
        "        out.append('DB_ERR: ' + str(e)[:100])",
        "",
        "    # ===== 额外: 列出所有已加载的 data.* 模块(找火力/调校真实路径) =====",
        "    data_mods = sorted([m for m in sys.modules if m.startswith('data.') and 'battle' in m.lower() or 'ship' in m.lower() or 'attr' in m.lower()])[:40]",
        "    out.append('DATA_SHIP_MODS: ' + str(data_mods))",
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
for _ in range(30):
    if done[0]:
        break
    time.sleep(0.3)

# 解析输出
try:
    lines = json.loads(res[0])
    for line in lines:
        if line.startswith("PYRESULT="):
            # 二次JSON解码
            pyresult = json.loads(line[9:])
            for item in pyresult:
                print("  " + item)
        else:
            print(line)
except Exception as e:
    print("parse err:", e)
    for r in res:
        print(r)
