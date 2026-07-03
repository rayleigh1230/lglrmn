"""
从 manifest.json 读取所有需要的图标文件名, 直接调 blueprint_utils 提取。
manifest 已记录 prefix->icon 映射, 只需提取去重后的唯一文件名即可。
比遍历 PREFIX 范围更精准、更快。
"""
import frida, time, json, os

OUT_DIR = r"F:\战斗模拟器\lglrmn\data\client\icons"
OUT_DIR_FORWARD = OUT_DIR.replace('\\', '/')

# 1. 从 manifest 读取所有唯一图标文件名
manifest_path = os.path.join(OUT_DIR, "manifest.json")
with open(manifest_path, encoding='utf-8') as f:
    manifest = json.load(f)

# 收集所有需要的文件名 (去重)
needed = set()
# prefix_to_icon 的 icon 字段
for info in manifest.get('prefix_to_icon', {}).values():
    if info.get('icon'):
        needed.add(info['icon'])
# enhance_id_to_icon
for fn in manifest.get('enhance_id_to_icon', {}).values():
    if fn:
        needed.add(fn)
# ship_class_icons, ship_type_to_icon
for k in ('ship_class_icons', 'ship_type_to_icon'):
    for fn in manifest.get(k, {}).values():
        if fn:
            needed.add(fn)
# stat_icons
for fn in manifest.get('stat_icons', {}).values():
    if fn:
        needed.add(fn)
# all_icons
for fn in manifest.get('all_icons', []):
    needed.add(fn)

# 已存在的文件跳过
existing = set(f for f in os.listdir(OUT_DIR) if f.endswith('.png'))
to_extract = sorted(needed - existing)
print(f"manifest 需要图标: {len(needed)} 个, 已有: {len(existing)}, 待提取: {len(to_extract)}")

# 2. 把待提取文件名写入 _needed_icons.py (游戏内 import 读取, 避免转义)
needed_py = os.path.join(OUT_DIR, "_needed_icons.py")
# manifest 还需要 prefix->path 映射, 以便游戏内用 PREFIX 找路径
prefix_to_path = {}
for pfx_str, info in manifest.get('prefix_to_icon', {}).items():
    if info.get('icon'):
        prefix_to_path[pfx_str] = info['icon']

with open(needed_py, 'w', encoding='utf-8') as f:
    f.write("NEEDED = " + json.dumps(to_extract).replace('"', "'") + "\n")
    # 同时写一份 path hint: 某些文件名能从 PREFIX 反查到完整 res 路径
    # 取每个文件的任意一个 PREFIX 的完整路径
    file_to_prefix = {}
    for pfx_str, info in manifest.get('prefix_to_icon', {}).items():
        fn = info.get('icon')
        if fn and fn not in file_to_prefix:
            file_to_prefix[fn] = pfx_str
    f.write("FILE_TO_PREFIX = " + json.dumps(file_to_prefix).replace('"', "'") + "\n")

print(f"待提取清单写入: {needed_py}")

# 3. JS 注入: 用 blueprint_utils.get_ship_system_effect_icon(PREFIX) 拿到完整路径, 再 load_file
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
        "import sys, traceback, json, os, importlib.util",
        "out = []",
        "OUT_DIR = '__OUT_DIR_FORWARD__'",
        "try:",
        "    import nxio3",
        "    from ui.bp_ship_view_facade import blueprint_utils",
        "    # 读待提取文件名 + 文件->PREFIX 映射",
        "    _spec = importlib.util.spec_from_file_location('_needed_icons', '__OUT_DIR_FORWARD__/_needed_icons.py')",
        "    _mod = importlib.util.module_from_spec(_spec)",
        "    _spec.loader.exec_module(_mod)",
        "    NEEDED = _mod.NEEDED",
        "    FILE_TO_PREFIX = _mod.FILE_TO_PREFIX",
        "    out.append('need='+str(len(NEEDED)))",
        "    # 建立 filename->完整res路径 的映射",
        "    # 对每个文件, 用其 PREFIX 调 get_ship_system_effect_icon 拿完整路径",
        "    fn_to_respath = {}",
        "    for fn in NEEDED:",
        "        pfx_str = FILE_TO_PREFIX.get(fn)",
        "        respath = None",
        "        if pfx_str:",
        "            try:",
        "                p = blueprint_utils.get_ship_system_effect_icon(int(pfx_str))",
        "                if p and isinstance(p,str): respath = p",
        "            except Exception: pass",
        "        if respath: fn_to_respath[fn] = respath",
        "    out.append('resolved '+str(len(fn_to_respath))+'/'+str(len(NEEDED))+' 路径')",
        "    saved=0; missing=0; errors=0",
        "    for fn in NEEDED:",
        "        dst = os.path.join(OUT_DIR, fn)",
        "        if os.path.exists(dst): continue",
        "        respath = fn_to_respath.get(fn)",
        "        if not respath:",
        "            # 没有PREFIX映射的, 尝试常见目录直接exists",
        "            candidates = [",
        "                'cocosui/_resource/icon/ship_system_effect/'+fn,",
        "                'cocosui/_resource/icon/icon_ship_attribute/'+fn,",
        "                'cocosui/_resource/icon/'+fn,",
        "                'cocosui/_resource/icon/icon_production_shiptype/'+fn.split('_',2)[-1] if 'production' in fn else None,",
        "            ]",
        "            for c in candidates:",
        "                if c and nxio3.exists('res:/'+c): respath=c; break",
        "        if not respath:",
        "            missing+=1; continue",
        "        try:",
        "            full='res:/'+respath.lstrip('/')",
        "            if not nxio3.exists(full): missing+=1; continue",
        "            data=nxio3.load_file(full)",
        "            if not data: missing+=1; continue",
        "            with open(dst,'wb') as f: f.write(data)",
        "            saved+=1",
        "        except Exception as e: errors+=1",
        "    out.append('saved='+str(saved)+' missing='+str(missing)+' errors='+str(errors))",
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
if not pid:
    print("NO_GAME"); exit()
print("attach", pid[0], "...")
JS = JS.replace('__OUT_DIR_FORWARD__', OUT_DIR_FORWARD)
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
for _ in range(600):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE (超时?)")
