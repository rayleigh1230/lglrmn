"""探测data_manager的正确API + 方案代码编解码函数"""
import frida, time, json

JS = r"""
var log=[];
try {
    var py = Process.getModuleByName("python311.dll");
    var Ens = new NativeFunction(py.getExportByName("PyGILState_Ensure"), 'pointer', []);
    var Rel = new NativeFunction(py.getExportByName("PyGILState_Release"), 'void', ['pointer']);
    var Run = new NativeFunction(py.getExportByName("PyRun_SimpleString"), 'int', ['pointer']);
    var AddM = new NativeFunction(py.getExportByName("PyImport_AddModule"), 'pointer', ['pointer']);
    var GetA = new NativeFunction(py.getExportByName("PyObject_GetAttrString"), 'pointer', ['pointer', 'pointer']);
    var Str = new NativeFunction(py.getExportByName("PyObject_Str"), 'pointer', ['pointer']);
    var UTF8 = new NativeFunction(py.getExportByName("PyUnicode_AsUTF8"), 'pointer', ['pointer']);
    var pyCode = [
        "import sys, traceback, json",
        "out=[]",
        "try:",
        "    import data_manager",
        "    # 列出data_manager的关键属性",
        "    attrs=[a for a in dir(data_manager) if not a.startswith('__')]",
        "    out.append('data_manager attrs: '+str(attrs[:40]))",
        "    # 找方案编解码相关模块",
        "    import importlib",
        "    # 搜索含scheme/blueprint的模块",
        "    try:",
        "        import common.game_data_utils as gdu",
        "        gdu_attrs=[a for a in dir(gdu) if 'scheme' in a.lower() or 'blueprint' in a.lower() or 'encode' in a.lower() or 'decode' in a.lower()]",
        "        out.append('game_data_utils相关: '+str(gdu_attrs))",
        "    except Exception as e: out.append('gdu err: '+str(e)[:80])",
        "    # 搜索scheme编解码模块",
        "    for modname in ['common.blueprint_scheme','common.config.scheme','common.bp_scheme','common.gameplay.blueprint_scheme']:",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            out.append(modname+': '+str([a for a in dir(mod) if not a.startswith('_')][:20]))",
        "        except: pass",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_PROBE_OUT=json.dumps(out)"
    ].join("\n");
    var code=Memory.allocUtf8String(pyCode);
    var gil=Ens(); var rc=Run(code);
    log.push("rc="+rc);
    if(rc==0){
        var mod=AddM(Memory.allocUtf8String("__main__"));
        var v=GetA(mod, Memory.allocUtf8String("_PROBE_OUT"));
        if(!v.isNull()){var st=Str(v);var cs=UTF8(st);if(!cs.isNull())log.push("RESULT="+cs.readUtf8String());}
    }
    Rel(gil);
} catch(e){log.push("JSERR="+e);}
send(JSON.stringify(log));
"""
done=[False];res=[]
def on_msg(m,d):
    if m["type"]=="send":res.append(m["payload"]);done[0]=True
    elif m["type"]=="error":res.append("ERR:"+m.get("description",""));done[0]=True
pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid:print("NO_GAME");exit()
print("attach",pid[0])
s=frida.attach(pid[0]).create_script(JS);s.on('message',on_msg);s.load()
for _ in range(60):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
