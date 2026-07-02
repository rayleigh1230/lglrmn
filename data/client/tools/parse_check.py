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
        "    # 用CV3000真实战报科技串测试(已知正确的)",
        "    cv_tech = '8020104,20,8206,1;8020110,20,8207,1;8020109,2,1132,5,1,1131,5,3,1210,5,4,1211,5,8,8890,1;8020112,19,8601,1,20,8210,1,5,8701,1;8020101,20,8206,1;'",
        "    cv_parsed = bu.parse_enhance_data(cv_tech)",
        "    out.append('CV3000解析: '+str(cv_parsed))",
        "    # 对比: 我的斗牛科技串",
        "    bull_tech = '4050101,1,4050111,5,2,303,5,3,304,5,4,204,2,5,4050112,5,6,203,4;4050102,1,1207,4,2,1206,4,3,1121,2;4050103,1,2201,4,2,2101,1,3,2105,1,4,2102,1;4050104,1,4102,5,2,4105,5;'",
        "    bull_parsed = bu.parse_enhance_data(bull_tech)",
        "    out.append('斗牛解析: '+str(bull_parsed))",
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
