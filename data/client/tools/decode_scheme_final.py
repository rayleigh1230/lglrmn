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
        "    # 列出模块的函数",
        "    funcs=[a for a in dir(scheme_ui) if not a.startswith('__') and callable(getattr(scheme_ui,a))]",
        "    scheme_funcs=[a for a in funcs if 'scheme' in a.lower() or 'code' in a.lower() or 'parse' in a.lower() or 'decode' in a.lower() or 'import' in a.lower()]",
        "    out.append('scheme_ui函数: '+str(scheme_funcs))",
        "    # 直接调用 parse_scheme_enhance_data",
        "    import inspect",
        "    try:",
        "        sig=inspect.signature(scheme_ui.parse_scheme_enhance_data)",
        "        out.append('parse_scheme_enhance_data签名: '+str(sig))",
        "        # 尝试解码方案代码",
        "        result=scheme_ui.parse_scheme_enhance_data('dfri819oLdACJHOL')",
        "        out.append('解码结果: '+str(result)[:500])",
        "    except Exception as e:",
        "        out.append('parse err: '+str(e)[:120])",
        "        # 也许参数不同. 看函数源码摘要",
        "        try:",
        "            src=inspect.getsource(scheme_ui.parse_scheme_enhance_data)",
        "            out.append('源码前300: '+src[:300])",
        "        except Exception as e2: out.append('src err: '+str(e2)[:60])",
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
