"""
阶段0.2a-6: 从游戏运行时获取真实的舰船图标路径
ShipFacadeAttribute 有 ship_icon/blueprint_icon 属性。直接在游戏里实例化或读取, 拿到真实路径。

策略:
1. 找 ShipFacadeAttribute 类 (从已dump的模块或运行时导入)
2. 取几个代表舰(CV3000/斗牛), 读取其 ship_icon/blueprint_icon 属性值
3. 用得到的路径验证 load_file 能读
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
        "    # 方法A: 尝试通过游戏的数据管理器获取舰船配置",
        "    # 先看已加载的模块里有哪些数据管理类",
        "    import sys as _sys",
        "    ship_related = [k for k in _sys.modules.keys() if 'ship' in k.lower() and 'attribute' in k.lower()][:20]",
        "    out.append('ship_attr modules: '+str(ship_related))",
        "    facade_mods = [k for k in _sys.modules.keys() if 'facade' in k.lower()][:20]",
        "    out.append('facade modules: '+str(facade_mods))",
        "    # 方法B: 直接尝试导入已知的模块名",
        "    for modname in ['data.ship.ship_attribute','data.ship.client_battle_ship_data','scene_zoom0.ship_data','data.ship']:",
        "        try:",
        "            m=__import__(modname, fromlist=['x'])",
        "            cls_list=[x for x in dir(m) if not x.startswith('_') and x[0].isupper()][:15]",
        "            out.append(modname+' -> classes: '+str(cls_list))",
        "        except Exception as e: out.append(modname+' ERR: '+repr(str(e))[:100])",
        "    # 方法C: 找全局数据管理器单例(游戏通常有 game.managers 之类)",
        "    for modname in ['game.managers','managers','game.data_manager','data.manager','g_data','game_data','gamedata']:",
        "        try:",
        "            m=__import__(modname, fromlist=['x'])",
        "            out.append(modname+' OK attrs: '+str([x for x in dir(m) if not x.startswith('_')][:20]))",
        "        except Exception: pass",
        "    # 方法D: 直接搜 cfg_ship 配置加载器 - 游戏肯定有读取cfg_ship的代码",
        "    cfg_mods = [k for k in _sys.modules.keys() if 'cfg_ship' in k.lower() or ('config' in k.lower() and 'ship' in k.lower())][:20]",
        "    out.append('cfg_ship modules: '+str(cfg_mods))",
        "    # 方法E: 更宽的搜索 - 所有含'icon'或'painting'或'art_blueprint'的已加载模块",
        "    icon_mods = [k for k in _sys.modules.keys() if any(t in k.lower() for t in ['icon','painting','art_blueprint','ship_icon','blueprint_icon'])][:25]",
        "    out.append('icon/painting modules: '+str(icon_mods))",
        "    # 方法F: 直接在res:/ 下试找含ship的任意已知png - 用cfg_module_effect.ICON_PATH验证",
        "    # icon_ship_dodge.png 已知存在于 cocosui/_resource/icon/ship_system_effect/",
        "    p='res:/cocosui/_resource/icon/ship_system_effect/icon_ship_dodge.png'",
        "    try:",
        "        b=nxio3.load_file(p)",
        "        out.append('load icon_ship_dodge: len='+str(len(b) if b else 0)+' head='+((b[:8].hex()) if b else 'None'))",
        "    except Exception as e: out.append('load dodge ERR: '+repr(str(e))[:100])",
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
