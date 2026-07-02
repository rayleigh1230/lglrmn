"""
阶段0.2a-11: 最终确认 - 舰船2D图像是渲染的还是静态的?
检查 ShipPaintPicMgr + painting2d 系统 + 找任何能生成舰船缩略图的途径
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
        "    # 1. ShipPaintPicMgr - 舰船图片管理器",
        "    try:",
        "        from ui.bp_ship_view_facade import ShipPaintPicMgr",
        "        m=[x for x in dir(ShipPaintPicMgr) if not x.startswith('_')]",
        "        out.append('ShipPaintPicMgr methods: '+str(m[:25]))",
        "    except Exception as e: out.append('ShipPaintPicMgr ERR: '+repr(str(e))[:100])",
        "    # 2. ship_utils - 舰船工具函数",
        "    try:",
        "        from ui.bp_ship_view_facade import ship_utils",
        "        m=[x for x in dir(ship_utils) if not x.startswith('_')]",
        "        out.append('ship_utils attrs: '+str(m[:30]))",
        "        for fn in m:",
        "            if 'icon' in fn.lower() or 'pic' in fn.lower() or 'portrait' in fn.lower() or 'thumb' in fn.lower():",
        "                out.append('  candidate: '+fn)",
        "    except Exception as e: out.append('ship_utils ERR: '+repr(str(e))[:100])",
        "    # 3. blueprint_utils",
        "    try:",
        "        from ui.bp_ship_view_facade import blueprint_utils",
        "        m=[x for x in dir(blueprint_utils) if not x.startswith('_')]",
        "        bp_icon_fns=[x for x in m if 'icon' in x.lower() or 'pic' in x.lower() or 'img' in x.lower()]",
        "        out.append('blueprint_utils icon-fns: '+str(bp_icon_fns))",
        "    except Exception as e: out.append('blueprint_utils ERR: '+repr(str(e))[:100])",
        "    # 4. 关键: 在 res:/ 下找任何 .png 含船型前缀(b_destroyer/s_carrier/b_frigate)",
        "    # 用 cfg_ship_attr 的 MODEL_NAME 拼路径, 模型同目录可能有PNG快照",
        "    from common.config.client_cfg import cfg_ship_attr",
        "    for sid in [80201,40501]:",
        "        rec=cfg_ship_attr.get(sid)",
        "        if not rec: continue",
        "        mn = rec[cfg_ship_attr.MODEL_NAME]  # e.g. s_carrier_l_001",
        "        # 模型目录 res:/model/ships/s_carrier_l_001/ 里有什么?",
        "        model_dir='res:/model/ships/'+mn",
        "        try:",
        "            ld=nxio3.list_dir(model_dir)",
        "            out.append('list_dir('+model_dir+')='+str(ld[:15] if ld else ld))",
        "        except Exception as e: out.append('list_dir model ERR: '+repr(str(e))[:80])",
        "        # 试模型同目录的png",
        "        for ext in ['.png','.tga','.jpg','.webp']:",
        "            p=model_dir+'/'+mn+ext",
        "            try:",
        "                if nxio3.exists(p): out.append('  FOUND model png: '+p)",
        "            except: pass",
        "            p2=model_dir+'/'+mn+'_portrait'+ext",
        "            try:",
        "                if nxio3.exists(p2): out.append('  FOUND portrait: '+p2)",
        "            except: pass",
        "    # 5. 终极: 直接搜ui_res里有没有 ship portrait 路径常量",
        "    try:",
        "        from common import icon_utils",
        "        ur=icon_utils.ui_res",
        "        ship_consts=[(k,repr(getattr(ur,k))[:80]) for k in dir(ur) if not k.startswith('_') and any(t in k for t in ['SHIP','SHIP_PORTRAIT','SHIP_ICON','SHIP_CARD','SHIP_THUMB','WARSHIP','SHIP_BP','BLUEPRINT_SHIP'])]",
        "        out.append('ui_res SHIP constants: '+str(ship_consts[:15]))",
        "    except Exception as e: out.append('ui_res ERR: '+repr(str(e))[:80])",
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
