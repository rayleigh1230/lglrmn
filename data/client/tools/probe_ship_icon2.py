"""
阶段0.2a-7: 获取舰船图标真实路径
ShipFacadeAttribute 实例化 + 读取属性; 或 icon_utils 的路径构造函数。
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
        "    # 1. icon_utils - 看它的路径构造方法",
        "    try:",
        "        from common import icon_utils",
        "        m=[x for x in dir(icon_utils) if not x.startswith('_')]",
        "        out.append('icon_utils attrs: '+str(m))",
        "    except Exception as e: out.append('icon_utils ERR: '+repr(str(e))[:100])",
        "    # 2. ShipFacadeAttribute - 看类定义里icon属性怎么取",
        "    try:",
        "        from data.ship.ship_attribute import ShipFacadeAttribute",
        "        import inspect",
        "        src = inspect.getsource(ShipFacadeAttribute)",
        "        # 提取含 icon/painting/art 的行",
        "        icon_lines = [l.strip() for l in src.split(chr(10)) if any(t in l.lower() for t in ['icon','painting','art_blueprint','ship_icon','blueprint_icon','side_icon','peak_icon'])]",
        "        out.append('ShipFacadeAttribute icon-related lines:')",
        "        for l in icon_lines[:20]: out.append('  '+l[:150])",
        "    except Exception as e: out.append('ShipFacadeAttribute ERR: '+repr(str(e))[:150])",
        "    # 3. Tb_cfg_ship - 看配置表接口, 取一行CV3000的数据",
        "    try:",
        "        from common.config.db.Tb_cfg_ship import Tb_cfg_ship",
        "        m=[x for x in dir(Tb_cfg_ship) if not x.startswith('_')]",
        "        out.append('Tb_cfg_ship attrs: '+str(m[:25]))",
        "        # 试着取数据",
        "        for method in ['get','get_data','get_record','get_row','getData','items','keys']:",
        "            if hasattr(Tb_cfg_ship, method):",
        "                try:",
        "                    if method in ['items','keys']: continue",
        "                    row = getattr(Tb_cfg_ship, method)(80201)",
        "                    out.append('Tb_cfg_ship.'+method+'(80201)='+repr(row)[:200] if row else method+' returned None')",
        "                    break",
        "                except Exception as e: out.append('Tb_cfg_ship.'+method+'_ERR: '+repr(str(e))[:80])",
        "    except Exception as e: out.append('Tb_cfg_ship ERR: '+repr(str(e))[:100])",
        "    # 4. 直接在icon_utils找ship icon构造函数",
        "    try:",
        "        from common import icon_utils",
        "        for fn in ['get_ship_icon','ship_icon','get_ship_blueprint_icon','get_icon_path','ship_icon_path','get_ship_icon_path','get_painting_icon']:",
        "            if hasattr(icon_utils, fn):",
        "                f=getattr(icon_utils,fn)",
        "                # 试调",
        "                for arg in [80201,'CV3000','80201',40501,'40501']:",
        "                    try:",
        "                        r=f(arg)",
        "                        out.append('icon_utils.'+fn+'('+repr(arg)+')='+repr(r))",
        "                        break",
        "                    except Exception as e: out.append('icon_utils.'+fn+'('+repr(arg)+')_ERR: '+repr(str(e))[:60])",
        "    except Exception as e: out.append('icon_utils call ERR: '+repr(str(e))[:100])",
        "    # 5. 暴力: 在res:/下试icon_utils可能拼出的各种路径",
        "    # 通用模式: cocosui/_resource/icon/ship_portrait/{ship_id}.png",
        "    candidates = [",
        "        'cocosui/_resource/icon/ship_portrait/{}.png',",
        "        'cocosui/_resource/icon/ship_portrait_{}.png',",
        "        'cocosui/_resource/icon/ship_card/{}.png',",
        "        'cocosui/_resource/icon/ship_card_{}.png',",
        "        'cocosui/_resource/icon/ship_list/{}.png',",
        "        'cocosui/_resource/icon/ship_list_{}.png',",
        "        'cocosui/_resource/icon/ship_thumb/{}.png',",
        "        'cocosui/_resource/icon/ship_thumb_{}.png',",
        "        'cocosui/_resource/icon/warship/{}.png',",
        "        'cocosui/_resource/icon/warship_{}.png',",
        "        'cocosui/_resource/icon/ship/ship_{}.png',",
        "        'cocosui/_resource/icon/ship_portrait/ship_{}.png',",
        "        'cocosui/_resource/painting2d/ship/{}.png',",
        "        'cocosui/_resource/painting2d/{}.png',",
        "        'cocosui/_resource/icon/blueprint/{}.png',",
        "        'cocosui/_resource/icon/blueprint/icon_blueprint_{}.png',",
        "        'cocosui/_resource/icon/art_blueprint/{}.png',",
        "    ]",
        "    hits=[]",
        "    for tmpl in candidates:",
        "        for m in ['80201','40501','CV3000','斗牛','7012','70121']:",
        "            p='res:/'+tmpl.format(m)",
        "            try:",
        "                if nxio3.exists(p): hits.append(p)",
        "            except: pass",
        "    out.append('ship icon candidate hits: '+str(hits[:15]))",
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
