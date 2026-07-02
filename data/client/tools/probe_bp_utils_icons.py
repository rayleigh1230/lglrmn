"""
阶段0.2a-12: 最终确认 blueprint_utils 的图标函数
get_ship_system_effect_icon (强化图标) + get_ship_icon + get_res_extend_icon_by_effect_id
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
        "import sys, traceback, json, inspect",
        "out = []",
        "try:",
        "    import nxio3",
        "    from ui.bp_ship_view_facade import blueprint_utils",
        "    # 1. 各图标函数签名+调用",
        "    for fn in ['get_ship_icon','get_ship_system_effect_icon','get_res_extend_icon_by_effect_id','refresh_hero_ship_icon','set_bp_ship_icon','get_ship_pic_camera_type']:",
        "        f=getattr(blueprint_utils,fn,None)",
        "        if f is None: out.append(fn+'=MISSING'); continue",
        "        try: out.append(fn+' doc='+repr((f.__doc__ or '')[:150]))",
        "        except: pass",
        "        # 调用尝试 - 多参数组合",
        "        test_args_list = [",
        "            ('80201',),('40501',),(80201,),(40501,),",
        "            ('80201','109'),('40501','109'),",
        "            (181,),(181,'01'),(18101,),",
        "            ('icon_system_intensify_101.png',),",
        "        ]",
        "        for args in test_args_list:",
        "            try:",
        "                r=f(*args)",
        "                out.append('  '+fn+str(args)+'='+repr(r)[:100])",
        "            except Exception as e:",
        "                msg=repr(str(e))[:60]",
        "                if 'argument' in msg or 'positional' in msg: continue  # 参数数不对跳过",
        "                out.append('  '+fn+str(args)+'_ERR='+msg)",
        "    # 2. SHIP_ABILITY_ICON / SHIP_ABILITY_ICON_LARGE 常量",
        "    for c in ['SHIP_ABILITY_ICON','SHIP_ABILITY_ICON_LARGE']:",
        "        try: out.append(c+'='+repr(getattr(blueprint_utils,c))[:200])",
        "        except Exception as e: out.append(c+' ERR: '+repr(str(e))[:60])",
        "    # 3. 获取系统效果图标 - 用真实enhance节点",
        "    # enhance 102010101 的 SYSTEM_EFFECT_PREFIX=181, 对应 effect key 18101",
        "    # 试 get_ship_system_effect_icon 多种调用",
        "    f=getattr(blueprint_utils,'get_ship_system_effect_icon',None)",
        "    if f:",
        "        for args in [(181,),(18101,),('181',),('18101',),(181,1),(18101,1),('181','01'),(80201,181),(80201,'181')]:",
        "            try:",
        "                r=f(*args)",
        "                out.append('  effect_icon'+str(args)+'='+repr(r)[:100])",
        "            except Exception as e:",
        "                msg=repr(str(e))[:50]",
        "                if 'argument' in msg or 'positional' in msg: continue",
        "                out.append('  effect_icon'+str(args)+'_ERR='+msg)",
        "    # 4. get_res_extend_icon_by_effect_id",
        "    f2=getattr(blueprint_utils,'get_res_extend_icon_by_effect_id',None)",
        "    if f2:",
        "        for args in [(181,),(18101,),('181',),('18101',),(181,1)]:",
        "            try:",
        "                r=f2(*args)",
        "                out.append('  extend_icon'+str(args)+'='+repr(r)[:100])",
        "            except Exception as e: continue",
        "    # 5. 确认 ShipPaintPicMgr.get_file_save_path - 渲染图存哪",
        "    try:",
        "        from ui.bp_ship_view_facade import ShipPaintPicMgr",
        "        mgr=ShipPaintPicMgr",
        "        for fn in ['get_file_save_path','get_file_save_abspath','get_pic_file_save_rltpath','get_filename_hash']:",
        "            m=getattr(mgr,fn,None)",
        "            if m:",
        "                for args in [(80201,),(40501,),('80201',),(80201,'109'),(80201,109)]:",
        "                    try:",
        "                        r=m(*args)",
        "                        out.append('  PaintMgr.'+fn+str(args)+'='+repr(r)[:120])",
        "                        break",
        "                    except Exception as e:",
        "                        msg=repr(str(e))[:50]",
        "                        if 'argument' in msg: continue",
        "                        out.append('  PaintMgr.'+fn+str(args)+'_ERR='+msg)",
        "    except Exception as e: out.append('PaintMgr ERR: '+repr(str(e))[:80])",
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
