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
        "    # 玩家数据通过 game_data_utils 或 data_manager 的data属性",
        "    # 从之前的dump知道有 _game_table_dict",
        "    bdm = data_manager.blueprint_data_mgr",
        "    bu = bdm.blueprint_utils",
        "    gdu = bu.game_data_utils",
        "    # game_data_utils 应该有访问玩家表的方法",
        "    gdu_attrs=[a for a in dir(gdu) if 'table' in a.lower() or 'get' in a.lower() or 'data' in a.lower()][:20]",
        "    out.append('game_data_utils方法: '+str(gdu_attrs))",
        "    # 尝试获取玩家方案数据",
        "    # 从之前知道 get_ship_bp_enhance_scheme_record(cfg_bp_id) 能获取方案",
        "    # 斗牛cfg_bp_id=40501",
        "    try:",
        "        scheme_record = bu.get_ship_bp_enhance_scheme_record(40501)",
        "        out.append('斗牛方案记录: '+str(scheme_record)[:500])",
        "    except Exception as e: out.append('get_scheme err: '+str(e)[:100])",
        "    # 也尝试 get_bp_system_scheme_record_list",
        "    try:",
        "        scheme_list = bu.get_bp_system_scheme_record_list(40501)",
        "        out.append('斗牛方案列表: '+str(scheme_list)[:500])",
        "    except Exception as e: out.append('get_list err: '+str(e)[:100])",
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
