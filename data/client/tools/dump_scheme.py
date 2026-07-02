"""dump蓝图方案数据：从Tb_blueprint_scheme读取方案编码与强化配置的映射"""
import frida, time, json, os

OUTDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config").replace("\\", "/")
OUTDIR_PY = json.dumps(OUTDIR)

JS = r"""
var OUTDIR_JS = """ + OUTDIR_PY + r""";
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
        "import sys, traceback, json, os",
        "out=[]",
        "try:",
        "    OUTDIR=" + JSON.stringify(OUTDIR_JS),
        "    # 方案数据在data_manager的玩家表里",
        "    import data_manager",
        "    dm = data_manager.get_data_manager()",
        "    # 找BLUEPRINT_SCHEME表",
        "    tbl = None",
        "    for attr in dir(dm):",
        "        if 'blueprint_scheme' in attr.lower() or 'bp_scheme' in attr.lower():",
        "            out.append('found attr: '+attr)",
        "            try:",
        "                tbl = getattr(dm, attr)",
        "                break",
        "            except: pass",
        "    if tbl is None:",
        "        # 尝试get_table",
        "        if hasattr(dm, 'get_table'):",
        "            tbl = dm.get_table('BLUEPRINT_SCHEME')",
        "        elif hasattr(dm, 'get_client_table'):",
        "            tbl = dm.get_client_table('BLUEPRINT_SCHEME')",
        "    if tbl is not None:",
        "        out.append('tbl type='+str(type(tbl)))",
        "        # 尝试读取数据",
        "        if hasattr(tbl, 'get_all_data'):",
        "            data = tbl.get_all_data()",
        "        elif hasattr(tbl, 'data'):",
        "            data = tbl.data",
        "        else:",
        "            data = tbl",
        "        out.append('data type='+str(type(data)))",
        "        if hasattr(data, 'items'):",
        "            cnt=0",
        "            for k,v in list(data.items())[:10]:",
        "                out.append('  key='+str(k)+' val='+repr(v)[:200])",
        "                cnt+=1",
        "            out.append('total='+str(len(data)))",
        "    else:",
        "        out.append('BLUEPRINT_SCHEME table not found via dm')",
        "        # 列出dm的所有属性找线索",
        "        attrs=[a for a in dir(dm) if not a.startswith('_')][:30]",
        "        out.append('dm attrs: '+str(attrs))",
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
