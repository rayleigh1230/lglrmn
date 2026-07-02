"""
阶段0.2b-3: 补提缺失的157个PREFIX图标
从manifest读取缺失PREFIX, 直接调 get_ship_system_effect_icon 提取。
"""
import frida, time, json, os

OUT_DIR = r"E:\战斗模拟器\data\client\icons"
OUT_DIR_FORWARD = OUT_DIR.replace('\\', '/')

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
        "import sys, traceback, json, os",
        "out = []",
        "OUT_DIR = '__OUT_DIR_FORWARD__'",
        "try:",
        "    import nxio3",
        "    from ui.bp_ship_view_facade import blueprint_utils",
        "    # 缺失PREFIX列表从外部文件读取 (避免转义问题)",
        "    import importlib.util",
        "    _spec = importlib.util.spec_from_file_location('_missing_prefixes', '__MISSING_DIR__/_missing_prefixes.py')",
        "    _mod = importlib.util.module_from_spec(_spec)",
        "    _spec.loader.exec_module(_mod)",
        "    MISSING = _mod.MISSING",
        "    saved=0; still_missing=0; new_files=[]",
        "    for pfx_str in MISSING:",
        "        try:",
        "            pfx = int(pfx_str)",
        "            path = blueprint_utils.get_ship_system_effect_icon(pfx)",
        "            if not path or not isinstance(path,str):",
        "                still_missing+=1; continue",
        "            full='res:/'+path",
        "            if not nxio3.exists(full):",
        "                still_missing+=1; continue",
        "            data=nxio3.load_file(full)",
        "            if not data:",
        "                still_missing+=1; continue",
        "            fn=os.path.basename(path)",
        "            dst=os.path.join(OUT_DIR,fn)",
        "            # 跳过已存在",
        "            if os.path.exists(dst): continue",
        "            with open(dst,'wb') as f: f.write(data)",
        "            saved+=1; new_files.append(fn)",
        "        except Exception as e:",
        "            out.append('pfx '+pfx_str+' ERR: '+str(e)[:60])",
        "    out.append('补提: saved='+str(saved)+' still_missing='+str(still_missing))",
        "    if new_files: out.append('new files: '+str(new_files[:20]))",
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

# 读缺失PREFIX
manifest = json.load(open(os.path.join(ICONS_DIR_FIX := r"E:\战斗模拟器\data\client\icons", "manifest.json"), encoding='utf-8'))
missing = [k for k, v in manifest['prefix_to_icon'].items() if not v['available']]
print(f"待补提PREFIX: {len(missing)} 个")

done = [False]; res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"]); done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description", "")); done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach", pid[0], "...")
JS = JS.replace('__OUT_DIR_FORWARD__', OUT_DIR_FORWARD)
# 把缺失列表写成Python源码片段文件, 游戏内import读取 (避免JS字符串转义地狱)
MISSING_PY = os.path.join(OUT_DIR, "_missing_prefixes.py")
with open(MISSING_PY, "w", encoding="utf-8") as f:
    f.write("MISSING = " + json.dumps(missing).replace('"', "'"))  # 用单引号, Python合法
print(f"缺失列表写入: {MISSING_PY}")
JS = JS.replace('__MISSING_DIR__', OUT_DIR_FORWARD)
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
for _ in range(300):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE")
