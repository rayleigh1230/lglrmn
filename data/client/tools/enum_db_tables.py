"""枚举 common.config.db 下所有可用的配置表模块名"""
import frida, time, json

JS = r"""
var log=[];
try {
    var py = Process.getModuleByName("python311.dll");
    var f = function(n){ return py.getExportByName(n); };
    var Ens=new NativeFunction(f("PyGILState_Ensure"),'pointer',[]);
    var Rel=new NativeFunction(f("PyGILState_Release"),'void',['pointer']);
    var Run=new NativeFunction(f("PyRun_SimpleString"),'int',['pointer']);
    var AddM=new NativeFunction(f("PyImport_AddModule"),'pointer',['pointer']);
    var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
    var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);
    var pyCode = [
        "import sys, traceback, json",
        "out=[]",
        "try:",
        "    import common.config.db as db",
        "    names=[n for n in dir(db) if n.startswith('Tb_')]",
        "    # 过滤含 scheme/blueprint/module/tech/system 的",
        "    filtered=[n for n in names if any(k in n.lower() for k in ['scheme','module','tech','system','slot','weapon','ship','blueprint','effect'])]",
        "    out.append('TOTAL Tb_ modules: '+str(len(names)))",
        "    out.append('--- filtered (scheme/module/tech/system/slot/weapon/ship/blueprint/effect) ---')",
        "    for n in sorted(filtered): out.append(n)",
        "    out.append('--- ALL Tb_ names ---')",
        "    out.append(','.join(sorted(names)))",
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
