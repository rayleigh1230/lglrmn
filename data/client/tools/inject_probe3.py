"""probe v3: 用frida 17正确API (Process.getModuleByName + module.getExportByName)"""
import frida, time, json

JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    log.push("python311.dll base=" + pyMod.base);
    var nxioMod = null;
    try { nxioMod = Process.getModuleByName("nxio3.npyd.dll"); log.push("nxio3.npyd.dll base=" + nxioMod.base); }
    catch(e){ log.push("nxio3 NOT LOADED: " + e); }

    // 用模块实例的getExportByName (frida 17正确API)
    function exp(mod, name) {
        return mod.getExportByName(name);
    }

    var PyGILState_Ensure = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var PyGILState_Release = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var PyRun_SimpleString = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var PyImport_AddModule = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var PyObject_GetAttrString = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var PyObject_Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var PyUnicode_AsUTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    var code = Memory.allocUtf8String(
        "import sys, traceback\n" +
        "out=[]\n" +
        "try:\n" +
        "    import nxio3\n" +
        "    out.append('nxio3='+str(nxio3))\n" +
        "    out.append('dir='+str([x for x in dir(nxio3) if not x.startswith('_')]))\n" +
        "    if hasattr(nxio3,'PyNxioImporter'):\n" +
        "        out.append('PyNxioImporter='+str(nxio3.PyNxioImporter))\n" +
        "        try:\n" +
        "            m=[x for x in dir(nxio3.PyNxioImporter) if not x.startswith('_')]\n" +
        "            out.append('methods='+str(m))\n" +
        "        except Exception as e: out.append('methods_err='+str(e))\n" +
        "    for f in sys.meta_path:\n" +
        "        out.append('meta='+type(f).__module__+'.'+type(f).__name__)\n" +
        "except Exception:\n" +
        "    out.append('PYERR='+traceback.format_exc())\n" +
        "import json\n" +
        "_probe_out=json.dumps(out)\n"
    );

    var gil = PyGILState_Ensure();
    var rc = PyRun_SimpleString(code);
    log.push("PyRun_SimpleString rc=" + rc);

    if (rc == 0) {
        var mod = PyImport_AddModule(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = PyObject_GetAttrString(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = PyObject_Str(v);
                var cs = PyUnicode_AsUTF8(st);
                if (!cs.isNull()) {
                    log.push("PYRESULT=" + cs.readUtf8String());
                }
            } else { log.push("_probe_out null"); }
        }
    }
    PyGILState_Release(gil);
} catch(e) {
    log.push("JSERR=" + e + " stack=" + (e.stack||""));
}
send(JSON.stringify(log));
"""

done=[False]; res=[]
def on_msg(m,d):
    if m["type"]=="send":
        res.append(m["payload"]); done[0]=True
    elif m["type"]=="error":
        res.append("JSERR:"+m.get("description","")+" | "+m.get("stack","")); done[0]=True

pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach",pid[0],"...")
s=frida.attach(pid[0]).create_script(JS)
s.on('message',on_msg); s.load()
for _ in range(20):
    if done[0]: break
    time.sleep(0.3)
try:
    for line in json.loads(res[0]):
        print("  "+line)
except:
    for r in res: print(r)
