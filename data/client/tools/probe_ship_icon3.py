"""
阶段0.2a-8: 调用 icon_utils 的图标函数拿真实路径
get_aircraft_icon / get_icon / MAP_ICON / ui_res
"""
import frida, time, json

JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }
    var PyGILState_Ensure = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var PyGILState_Release = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var PyRun_SimpleString = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var PyImport_AddModule = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var PyObject_GetAttrString = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var PyObject_Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var PyUnicode_AsUTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    var pyCode = [
        "import sys, traceback, json",
        "out = []",
        "try:",
        "    import nxio3",
        "    from common import icon_utils",
        "    import inspect",
        "    # 1. 探测 get_aircraft_icon / get_icon 签名",
        "    for fn in ['get_aircraft_icon','get_icon','get_props_icon','get_rich_icon']:",
        "        f=getattr(icon_utils,fn,None)",
        "        if f is None: out.append(fn+'=MISSING'); continue",
        "        try: out.append(fn+' doc='+repr((f.__doc__ or '')[:120]))",
        "        except: pass",
        "        # 试多种参数",
        "        results=[]",
        "        for arg in [80201,40501,70121,30401,'80201','CV3000']:",
        "            try:",
        "                r=f(arg)",
        "                results.append((repr(arg), repr(r)[:100]))",
        "            except Exception as e: results.append((repr(arg),'ERR:'+repr(str(e))[:60]))",
        "        out.append(fn+' results: '+str(results))",
        "    # 2. ui_res 模块 - 看路径常量",
        "    try:",
        "        ur=icon_utils.ui_res",
        "        out.append('ui_res type='+str(type(ur))+' attrs='+str([x for x in dir(ur) if not x.startswith('_')][:30]))",
        "    except Exception as e: out.append('ui_res ERR: '+repr(str(e))[:80])",
        "    # 3. MAP_ICON / ICON_FILE_M0 / ICON_FILE_M1 常量",
        "    for c in ['MAP_ICON','ICON_FILE_M0','ICON_FILE_M1']:",
        "        try:",
        "            v=getattr(icon_utils,c)",
        "            out.append(c+'='+repr(v)[:200])",
        "        except Exception as e: out.append(c+' ERR: '+repr(str(e))[:60])",
        "    # 4. 直接搜UI模块里舰船图标 - ui.ship_macro 可能有",
        "    import sys as _sys",
        "    bp_view_mods=[k for k in _sys.modules.keys() if 'bp_ship_view' in k.lower() or 'blueprint_painting' in k.lower() or 'ship_view' in k.lower()][:10]",
        "    out.append('bp_view modules: '+str(bp_view_mods))",
        "    # 5. ui.bp_ship_view_facade",
        "    try:",
        "        import ui.bp_ship_view_facade as bpvf",
        "        m=[x for x in dir(bpvf) if not x.startswith('_')]",
        "        out.append('bp_ship_view_facade attrs: '+str(m[:30]))",
        "        # 看里面有无icon路径相关",
        "        for attr in m:",
        "            v=getattr(bpvf,attr)",
        "            if isinstance(v,str) and ('icon' in v.lower() or 'painting' in v.lower()):",
        "                out.append('  '+attr+'='+repr(v)[:100])",
        "    except Exception as e: out.append('bpvf ERR: '+repr(str(e))[:100])",
        "    # 6. 关键: 找'get_ship'相关函数 - 全模块搜",
        "    ship_icon_funcs=[]",
        "    for modname in ['common.icon_utils','common.config.client_cfg.cfg_ship_attr','ui.bp_ship_view_facade','data.ship.ship_facade_attribute']:",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            for attr in dir(mod):",
        "                if 'icon' in attr.lower() and 'ship' in attr.lower():",
        "                    ship_icon_funcs.append(modname+'.'+attr)",
        "        except Exception: pass",
        "    out.append('ship-icon funcs found: '+str(ship_icon_funcs))",
        "    # 7. cfg_ship_attr - 客户端舰船属性配置, 应该有icon字段",
        "    try:",
        "        from common.config.client_cfg import cfg_ship_attr",
        "        m=[x for x in dir(cfg_ship_attr) if not x.startswith('_')]",
        "        out.append('cfg_ship_attr attrs: '+str(m[:25]))",
        "    except Exception as e: out.append('cfg_ship_attr ERR: '+repr(str(e))[:100])",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_probe_out = json.dumps(out)"
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil = PyGILState_Ensure();
    var rc = PyRun_SimpleString(code);
    log.push("rc=" + rc);
    if (rc == 0) {
        var mod = PyImport_AddModule(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = PyObject_GetAttrString(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = PyObject_Str(v);
                var cs = PyUnicode_AsUTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
            }
        }
    }
    PyGILState_Release(gil);
} catch(e) {
    log.push("JSERR=" + e + " stack=" + (e.stack||""));
}
send(JSON.stringify(log));
"""

done = [False]; res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"]); done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description", "")); done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach", pid[0], "...")
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
for _ in range(50):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE")
