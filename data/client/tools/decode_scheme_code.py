import frida, time, json
JS = r"""
var log=[];
try {
    var py = Process.getModuleByName("python311.dll");
    var Ens = new NativeFunction(py.getExportByName("PyGILState_Ensure"), 'pointer', []);
    var Rel = new NativeFunction(py.getExportByName("PyGILState_Release"), 'void', ['pointer']);
    var Run = new NativeFunction(py.getExportByName("PyRun_SimpleString"), 'int', ['pointer']);
    var AddM = new NativeFunction(py.getExportByName("PyImport_AddModule"), 'pointer', ['pointer']);
    var GetA = new NativeFunction(py.getExportByName("PyObject_GetAttrString"), 'pointer', ['pointer','pointer']);
    var Str = new NativeFunction(py.getExportByName("PyObject_Str"), 'pointer', ['pointer']);
    var UTF8 = new NativeFunction(py.getExportByName("PyUnicode_AsUTF8"), 'pointer', ['pointer']);
    var pyCode = [
        "import sys, traceback, json",
        "out=[]",
        "try:",
        "    import data_manager",
        "    bu = data_manager.blueprint_data_mgr.blueprint_utils",
        "    # 搜索方案编解码函数",
        "    for attr in dir(bu):",
        "        if any(k in attr.lower() for k in ['decode','encode','code','share','import','export']):",
        "            out.append(attr+': '+str(type(getattr(bu,attr))))",
        "    # 也搜索protocol模块",
        "    try:",
        "        proto = data_manager.blueprint_data_mgr.protocol",
        "        for attr in dir(proto):",
        "            if any(k in attr.lower() for k in ['scheme','code','decode','encode','share']):",
        "                out.append('protocol.'+attr+': '+str(type(getattr(proto,attr))))",
        "    except Exception as e: out.append('proto err: '+str(e)[:80])",
        "    # 搜索utils模块",
        "    try:",
        "        ut = data_manager.blueprint_data_mgr.utils",
        "        for attr in dir(ut):",
        "            if any(k in attr.lower() for k in ['scheme','code','decode','encode','share','base']):",
        "                out.append('utils.'+attr+': '+str(type(getattr(ut,attr))))",
        "    except Exception as e: out.append('utils err: '+str(e)[:80])",
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
