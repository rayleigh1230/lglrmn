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
        "    import ui.ship_blueprint_intensify_scheme_main as scheme_ui",
        "    import inspect",
        "    # get_scheme_output_str 和 get_scheme_info 的签名",
        "    for fn_name in ['get_scheme_output_str','get_scheme_info','cal_scheme_cost','parse_enhance_proto_data']:",
        "        try:",
        "            fn=getattr(scheme_ui,fn_name)",
        "            sig=inspect.signature(fn)",
        "            out.append(fn_name+': '+str(sig))",
        "        except Exception as e: out.append(fn_name+' err: '+str(e)[:60])",
        "    # get_scheme_output_str 可能是生成方案代码. 看它的逆操作",
        "    # SchemeData 和 SchemeRecommendData 是数据类",
        "    out.append('SchemeData fields: '+str([a for a in dir(scheme_ui.SchemeData) if not a.startswith('_')]))",
        "    out.append('SchemeRecommendData fields: '+str([a for a in dir(scheme_ui.SchemeRecommendData) if not a.startswith('_')]))",
        "    # 看BlueprintSchemeField的字段",
        "    out.append('BlueprintSchemeField: '+str([a for a in dir(scheme_ui.BlueprintSchemeField) if not a.startswith('_')]))",
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
