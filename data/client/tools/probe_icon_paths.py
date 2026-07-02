"""
阶段0.2a-5: 确定各类图标的虚拟路径前缀
load_file 用确切路径能读, 但要批量提取需知道每类图标的目录。

cfg_system_effect.PATH 形如 'icon_system_intensify_101.png' (仅文件名)
cfg_module_effect.ICON_PATH 形如 'cocosui/_resource/icon/ship_system_effect/icon_ship_dodge.png' (全路径)
舰船缩略图: cfg_ship[23] model code, 路径未知

测试多个候选前缀, 看哪些 exists()=True。
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
        "    # 1. intensify 图标的多候选前缀 (cfg_system_effect.PATH = icon_system_intensify_NNN.png)",
        "    intensify_prefixes = [",
        "        'cocosui/_resource/icon/system_intensify_new/',",
        "        'cocosui/_resource/icon/system_intensify/',",
        "        'cocosui/_resource/icon/',",
        "        'icon/system_intensify_new/',",
        "        'icon/system_intensify/',",
        "    ]",
        "    for pref in intensify_prefixes:",
        "        for num in ['101','235','236']:",
        "            p = 'res:/'+pref+'icon_system_intensify_'+num+'.png'",
        "            try: ex=nxio3.exists(p)",
        "            except Exception as e: ex='ERR'",
        "            if ex: out.append('HIT intensify: '+pref+' num='+num)",
        "    # 2. 舰船缩略图路径候选 - 用已知model code",
        "    # cfg_ship[23] 样例: CV3000, SC002, 斗牛-脉冲",
        "    ship_candidates = [",
        "        # 标准 cocos ship icon 命名",
        "        'cocosui/_resource/icon/ship/{}.png',",
        "        'cocosui/_resource/icon/ship/icon_ship_{}.png',",
        "        'cocosui/_resource/icon/ship_{}.png',",
        "        'cocosui/_resource/icon/ship_icon_{}.png',",
        "        'cocosui/_resource/ship/{}.png',",
        "        'cocosui/_resource/painting/ship/{}.png',",
        "        'cocosui/_resource/painting/{}.png',",
        "        'cocosui/_resource/art/ship/{}.png',",
        "        'cocosui/_resource/art/{}.png',",
        "        'cocosui/_resource/hero/{}.png',",
        "        'cocosui/_resource/hero_ship/{}.png',",
        "        'cocosui/_resource/cg/{}.png',",
        "        'cg/ship/{}.png',",
        "        'cg/cn/{}.png',",
        "        'cocosui/_resource/cg/cn/{}.png',",
        "        'cocosui/_resource/cg/cn/hero_ship_cg/{}.png',",
        "        'cocosui/_resource/cg/cn/hero_ship_cg/hero_ship_{}.png',",
        "    ]",
        "    test_models = ['CV3000','SC002','斗牛-脉冲','7012']",
        "    hit_ship = []",
        "    for tmpl in ship_candidates:",
        "        for m in test_models:",
        "            p = 'res:/'+tmpl.format(m)",
        "            try: ex=nxio3.exists(p)",
        "            except Exception as e: ex=False",
        "            if ex: hit_ship.append((tmpl, m, p))",
        "    out.append('ship thumbnail hits: '+str(hit_ship))",
        "    # 3. 舰船蓝色图icon - cfg可能有blueprint_icon字段",
        "    bp_candidates = [",
        "        'cocosui/_resource/icon/blueprint/{}.png',",
        "        'cocosui/_resource/icon/blueprint/icon_bp_{}.png',",
        "        'cocosui/_resource/icon/ship_blueprint/{}.png',",
        "        'cocosui/_resource/painting/blueprint/{}.png',",
        "        'cocosui/_resource/art_blueprint/{}.png',",
        "        'cocosui/_resource/icon/art_blueprint_system/{}.png',",
        "    ]",
        "    hit_bp=[]",
        "    for tmpl in bp_candidates:",
        "        for m in test_models+['40501','80201']:",
        "            p='res:/'+tmpl.format(m)",
        "            try: ex=nxio3.exists(p)",
        "            except: ex=False",
        "            if ex: hit_bp.append((tmpl,m))",
        "    out.append('blueprint icon hits: '+str(hit_bp))",
        "    # 4. 暴力探索: 在 res:/ 下找含 'CV3000' 或 'ship' 的目录是否存在",
        "    probe_dirs = [",
        "        'res:/cocosui/_resource/painting', 'res:/cocosui/_resource/art',",
        "        'res:/cocosui/_resource/hero', 'res:/cocosui/_resource/hero_ship',",
        "        'res:/cocosui/_resource/cg', 'res:/cocosui/_resource/cg/cn',",
        "        'res:/cocosui/_resource/cg/cn/hero_ship_cg', 'res:/cocosui/_resource/icon/ship',",
        "        'res:/cocosui/_resource/icon/blueprint', 'res:/cocosui/_resource/ship',",
        "        'res:/cg', 'res:/cg/cn', 'res:/cg/cn/hero_ship_cg', 'res:/painting',",
        "        'res:/art', 'res:/hero_ship_cg',",
        "    ]",
        "    dir_hits=[]",
        "    for d in probe_dirs:",
        "        try:",
        "            ld=nxio3.list_dir(d)",
        "            ex=nxio3.exists(d)",
        "            if ex or (ld and len(ld)>0):",
        "                dir_hits.append(d+' exists='+str(ex)+' list='+str(ld[:5] if ld else ld))",
        "        except Exception as e: pass",
        "    out.append('dir hits: '+str(dir_hits))",
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
