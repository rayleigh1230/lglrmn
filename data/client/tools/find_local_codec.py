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
        "    # 搜索所有含scheme/code且callable的函数",
        "    funcs=[]",
        "    for attr in dir(bu):",
        "        if attr.startswith('_'): continue",
        "        obj=getattr(bu,attr)",
        "        if callable(obj) and any(k in attr.lower() for k in ['scheme','intensify','recommend']):",
        "            funcs.append(attr)",
        "    out.append('相关函数: '+str(funcs))",
        "    # 重点看 get_bp_cur_scheme_recommend_enhance 和 get_intensify_scheme_enhance_num",
        "    import inspect",
        "    for fn_name in ['get_bp_cur_scheme_recommend_enhance','get_intensify_scheme_enhance_num','get_ship_bp_enhance_scheme_record','parse_ship_scheme_unique_id']:",
        "        try:",
        "            fn=getattr(bu,fn_name)",
        "            sig=inspect.signature(fn)",
        "            out.append(fn_name+': '+str(sig))",
        "        except Exception as e: out.append(fn_name+' err: '+str(e)[:60])",
        "    # 搜索ui层的方案导入导出",
        "    try:",
        "        import common.ui.blueprint as bp_ui",
        "        ui_funcs=[a for a in dir(bp_ui) if 'code' in a.lower() or 'share' in a.lower() or 'import' in a.lower() or 'export' in a.lower() or 'scheme' in a.lower()]",
        "        out.append('bp_ui相关: '+str(ui_funcs))",
        "    except Exception as e: out.append('bp_ui err: '+str(e)[:80])",
        "    # 搜索nxgui或ui_mgr里的方案编解码",
        "    try:",
        "        import common.config.blueprint_scheme as bps",
        "        out.append('blueprint_scheme模块: '+str([a for a in dir(bps) if not a.startswith('_')][:20]))",
        "    except: pass",
        "    # 直接搜索含share_code的函数",
        "    import gc",
        "    for obj in gc.get_objects():",
        "        if hasattr(obj,'__name__') and 'share_code' in str(getattr(obj,'__name__','')).lower():",
        "            out.append('gc找到: '+obj.__name__+' from '+str(getattr(obj,'__module__','?')))",
        "            break",
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
for _ in range(90):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
