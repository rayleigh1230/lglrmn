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
        "    # 方案代码格式dfri819oLdACJHOL. 16字符.",
        "    # 搜索所有已加载模块中含encode/decode scheme的函数",
        "    import sys as _sys",
        "    found=[]",
        "    for modname, mod in list(_sys.modules.items()):",
        "        if mod is None: continue",
        "        try:",
        "            for attr in dir(mod):",
        "                if attr.startswith('_'): continue",
        "                al=attr.lower()",
        "                if ('scheme' in al or 'share_code' in al) and ('encode' in al or 'decode' in al or 'gen' in al or 'parse' in al or 'import' in al):",
        "                    found.append(modname+'.'+attr)",
        "                    if len(found)>30: break",
        "        except: pass",
        "        if len(found)>30: break",
        "    out.append('找到的编解码函数: '+json.dumps(found, ensure_ascii=False))",
        "    # 也搜索含 'def gen_share' 或 'def decode' 在源码里的",
        "    # 重点搜索blueprint相关的UI模块",
        "    for modname in ['common.ui','common.blueprint','common.gameplay.blueprint',",
        "                    'data_manager.blueprint_data_mgr','common.config.client_cfg']:",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            attrs=[a for a in dir(mod) if 'code' in a.lower() or 'scheme' in a.lower()]",
        "            if attrs: out.append(modname+': '+str(attrs[:15]))",
        "        except: pass",
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
for _ in range(120):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
