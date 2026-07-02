"""
阶段0.2a-10: 验证舰船图标PNG的正确路径前缀
已知: ICON字段值如 's_carrier_l_001_80201.png' (纯文件名)
.gim模型在 res:/model/ships/ 下。PNG图标在哪个目录?
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
        "    from common.config.client_cfg import cfg_ship_attr",
        "    # 取几个舰的icon文件名",
        "    targets = {}",
        "    for sid in [80201,40501,30401,10201]:",
        "        rec = cfg_ship_attr.get(sid)",
        "        if rec:",
        "            targets[sid]={'icon':rec[cfg_ship_attr.ICON],'bp_icon':rec[cfg_ship_attr.BLUEPRINT_ICON]}",
        "    out.append('targets: '+str(targets))",
        "    # 暴力试多种前缀目录",
        "    icon_dirs = [",
        "        'cocosui/_resource/icon/ship',",
        "        'cocosui/_resource/icon/ship_icon',",
        "        'cocosui/_resource/icon/ship_portrait',",
        "        'cocosui/_resource/icon/ship_card',",
        "        'cocosui/_resource/icon/ship_thumb',",
        "        'cocosui/_resource/icon/warship',",
        "        'cocosui/_resource/icon',",
        "        'cocosui/_resource/painting/ship',",
        "        'cocosui/_resource/painting2d',",
        "        'cocosui/_resource/painting2d/ship',",
        "        'cocosui/_resource/cg/cn/hero_ship_cg',",
        "        'cocosui/_resource/cg/cn',",
        "        'cocosui/_resource/cg',",
        "        'cocosui/_resource/hero',",
        "        'cocosui/_resource/hero_ship',",
        "        'cocosui/_resource/art/ship',",
        "        'cocosui/_resource/art',",
        "        'cocosui/_resource/art_blueprint',",
        "        'cocosui/_resource/icon/blueprint',",
        "        'cocosui/_resource/icon/ship_blueprint',",
        "        'cocosui/_resource/painting/blueprint',",
        "        'painting/ship',",
        "        'painting2d',",
        "        'cg/cn/hero_ship_cg',",
        "        'hero_ship_cg',",
        "        'icon/ship',",
        "        'ship',",
        "    ]",
        "    hits=[]",
        "    for sid,icons in targets.items():",
        "        for kind,fn in [('icon',icons['icon']),('bp_icon',icons['bp_icon'])]:",
        "            found=False",
        "            for d in icon_dirs:",
        "                p='res:/'+d+'/'+fn",
        "                try:",
        "                    if nxio3.exists(p):",
        "                        b=nxio3.load_file(p)",
        "                        hits.append((sid,kind,d,fn,len(b)))",
        "                        found=True",
        "                        break",
        "                except: pass",
        "            if not found:",
        "                hits.append((sid,kind,'NOT_FOUND',fn,0))",
        "    out.append('icon path resolution: '+str(hits))",
        "    # 另外: 试blueprint_icon路径, 它可能是船的2D全身图",
        "    # 试 'cocosui/_resource/painting2d/' 系列(舰船涂装2D图常用这)",
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
