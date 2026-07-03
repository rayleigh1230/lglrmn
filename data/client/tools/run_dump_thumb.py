import frida, time, json, os
HERE = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/')
JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }
    var Ens = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var Rel = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var Run = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var AddM = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var GetA = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var UTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);
    var pyCode = "import importlib.util as _ilu\n_spec=_ilu.spec_from_file_location('_p','__P__')\n_m=_ilu.module_from_spec(_spec)\n_spec.loader.exec_module(_m)\n_probe_out=_m.RESULT";
    var code = Memory.allocUtf8String(pyCode.replace('__P__', '__HERE__/dump_thumb_map.py'));
    var gil = Ens(); var rc = Run(code); log.push("rc="+rc);
    if (rc == 0) { var mod = AddM(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) { var v = GetA(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) { var st = Str(v); var cs = UTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String()); } } }
    Rel(gil);
} catch(e) { log.push("JSERR=" + e); }
send(JSON.stringify(log));
""".replace("__HERE__", HERE)
done=[False]; res=[]
def on_msg(m,d):
    if m["type"]=="send": res.append(m["payload"]); done[0]=True
    elif m["type"]=="error": res.append("JSERR:"+m.get("description","")); done[0]=True
pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach",pid[0])
s=frida.attach(pid[0]).create_script(JS); s.on('message',on_msg); s.load()
for _ in range(60):
    if done[0]: break
    time.sleep(0.3)
try:
    for line in json.loads(res[0]):
        if line.startswith("PYRESULT="):
            for item in json.loads(line[9:]): print("  "+item)
        else: print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r)
