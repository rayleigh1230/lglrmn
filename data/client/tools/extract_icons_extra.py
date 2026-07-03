"""
阶段0.2b-2: 补充提取 - 舰船属性/能力图标 + 模块效果图标
已知路径模式:
  cocosui/_resource/icon/icon_ship_attribute/icon_*.png  (火力/防空等)
  cocosui/_resource/icon/icon_ship_ability/icon_*.png
  cocosui/_resource/icon/ship_system_effect/icon_*.png
策略: 用蓝图蓝表常量枚举, 或在res:/下用exists()扫描已知目录的文件名。
但list_dir对res:/无效, 改用: 收集ui_res里所有icon路径常量。
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
        "    from common import icon_utils",
        "    ur = icon_utils.ui_res",
        "    stats={'saved':0,'skip':0,'missing':0}",
        "    saved=[]",
        "    def save(rel):",
        "        full='res:/'+rel.lstrip('/')",
        "        try:",
        "            if not nxio3.exists(full): stats['missing']+=1; return",
        "            data=nxio3.load_file(full)",
        "            if not data: stats['missing']+=1; return",
        "            fn=os.path.basename(rel)",
        "            with open(os.path.join(OUT_DIR,fn),'wb') as f: f.write(data)",
        "            stats['saved']+=1; saved.append(fn)",
        "        except Exception as e: out.append('save ERR '+rel+': '+str(e)[:60])",
        "    # 收集ui_res里所有 .png 路径常量",
        "    all_paths=set()",
        "    for attr in dir(ur):",
        "        if attr.startswith('_'): continue",
        "        try: v=getattr(ur,attr)",
        "        except: continue",
        "        def collect(val):",
        "            if isinstance(val,str) and val.endswith('.png') and 'cocosui' in val: all_paths.add(val)",
        "            elif isinstance(val,(list,tuple)):",
        "                for x in val: collect(x)",
        "            elif isinstance(val,dict):",
        "                for x in val.values(): collect(x)",
        "        collect(v)",
        "    out.append('ui_res含png常量: '+str(len(all_paths)))",
        "    for p in sorted(all_paths): save(p)",
        "    # 额外: ship_system_effect 目录常见图标 (battle report里用到的)",
        "    extra_paths = [",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_dodge.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_torpedo.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_anti_interception.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_orbital_strike.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_dodge_torpedo.png',",
        "    ]",
        "    for p in extra_paths: save(p)",
        "    out.append('===== 补充提取统计 =====')",
        "    out.append('saved='+str(stats['saved'])+' missing='+str(stats['missing']))",
        "    # 分类统计",
        "    cats={}",
        "    for fn in saved:",
        "        if 'antiship' in fn or 'firepower' in fn: cats['antiship']=cats.get('antiship',0)+1",
        "        elif 'airdefense' in fn or 'antiair' in fn: cats['airdefense']=cats.get('airdefense',0)+1",
        "        elif 'siege' in fn: cats['siege']=cats.get('siege',0)+1",
        "        elif 'aircraft' in fn or 'airplane' in fn: cats['aircraft']=cats.get('aircraft',0)+1",
        "        elif 'dodge' in fn: cats['dodge']=cats.get('dodge',0)+1",
        "        elif 'repair' in fn: cats['repair']=cats.get('repair',0)+1",
        "        else: cats['other']=cats.get('other',0)+1",
        "    out.append('分类: '+str(cats))",
        "    # 增量合并到_extracted_files.json",
        "    mf=os.path.join(OUT_DIR,'_extracted_files.json')",
        "    try:",
        "        old=json.load(open(mf,encoding='utf-8'))",
        "        merged=sorted(set(old.get('saved',[]))|set(saved))",
        "        json.dump({'saved':merged,'missing':old.get('missing',[])},open(mf,'w',encoding='utf-8'),ensure_ascii=False)",
        "        out.append('manifest合并后总数: '+str(len(merged)))",
        "    except Exception as e: out.append('manifest合并ERR: '+str(e)[:60])",
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
JS = JS.replace('__OUT_DIR_FORWARD__', OUT_DIR_FORWARD)
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
