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
        "    # 方案数据在BLUEPRINT_SCHEME玩家表",
        "    # 通过data_manager获取",
        "    dm=data_manager",
        "    # 找blueprint_data_mgr的方案数据",
        "    bdm=dm.blueprint_data_mgr",
        "    # BlueprintData可能含方案",
        "    for attr in dir(bdm):",
        "        if 'scheme' in attr.lower() and 'data' in attr.lower():",
        "            out.append('bdm.'+attr+': '+str(type(getattr(bdm,attr))))",
        "    # 直接找玩家方案表",
        "    # Tb_blueprint_scheme 是玩家数据表, 通过TableID访问",
        "    try:",
        "        TableID = bdm.TableID",
        "        out.append('TableID type: '+str(type(TableID)))",
        "        # 获取BLUEPRINT_SCHEME表",
        "        tbl_id = getattr(TableID, 'BLUEPRINT_SCHEME', None)",
        "        out.append('BLUEPRINT_SCHEME tbl_id: '+str(tbl_id))",
        "    except Exception as e: out.append('TableID err: '+str(e)[:80])",
        "    # 尝试通过data_manager.data访问",
        "    try:",
        "        data = dm.data if hasattr(dm,'data') else None",
        "        if data:",
        "            sch = data.get_table('BLUEPRINT_SCHEME') if hasattr(data,'get_table') else None",
        "            if sch:",
        "                all_data=sch.get_all_data() if hasattr(sch,'get_all_data') else sch",
        "                out.append('BLUEPRINT_SCHEME记录数: '+str(len(all_data)))",
        "                # 找含dfri819oLdACJHOL的",
        "                for k,v in list(all_data.items())[:5]:",
        "                    out.append('  key='+str(k)+' val='+repr(v)[:200])",
        "    except Exception as e: out.append('data err: '+str(e)[:100])",
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
