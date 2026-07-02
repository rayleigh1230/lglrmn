"""
阶段0.2a-3: 找到正确的文件读取API
已知: 虚拟根是 'res:/' (exists('res:/path')=True)。
待定: load_file 返回None, open 报参错。需找正确读取方式。

探测:
1. load_file 不同调用形式 (路径单独 / 返回值检查)
2. open 不同模式参数 ('r','rb','读')
3. NpkReader / NxFileIO / JsonDataLoader 类的方法面
4. walk_dir('res:/') 看真实目录树
"""
import frida, time, json

JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }
    var PyGILState_Ensure = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var PyGILState_Release = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var PyRun_SimpleString = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var PyImport_AddModule = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var PyObject_GetAttrString = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var PyObject_Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var PyUnicode_AsUTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    var pyCode = [
        "import sys, traceback, json",
        "out = []",
        "try:",
        "    import nxio3, inspect",
        "    P = 'res:/cocosui/_resource/icon/system_intensify_new/icon_system_intensify_235.png'",
        "    # A. 类方法面",
        "    for cls in ['NpkReader','NpkIndex','NxFileIO','JsonDataLoader','NxioImporter']:",
        "        c = getattr(nxio3, cls, None)",
        "        if c is None: out.append(cls+'=MISSING'); continue",
        "        m = [x for x in dir(c) if not x.startswith('__')]",
        "        out.append(cls+' methods='+str(m))",
        "    # B. load_file 详查: 返回类型 / 多调用形式",
        "    for call_desc, result_getter in [",
        "        ('load_file(P)', lambda: nxio3.load_file(P)),",
        "    ]:",
        "        try:",
        "            r = result_getter()",
        "            out.append(call_desc+' -> '+str(type(r))+' repr='+repr(r)[:120])",
        "        except Exception as e: out.append(call_desc+'_ERR='+repr(str(e))[:200])",
        "    # C. open 多模式",
        "    for mode in ['rb','r',None,'read','b']:",
        "        try:",
        "            if mode is None: fh = nxio3.open(P)",
        "            else: fh = nxio3.open(P, mode)",
        "            out.append('open(P,'+repr(mode)+') -> '+str(type(fh))+' '+repr(fh)[:80])",
        "            if fh is not None:",
        "                if hasattr(fh,'read'):",
        "                    head = fh.read(16)",
        "                    out.append('  read(16)='+repr(head)+' type='+str(type(head)))",
        "                if hasattr(fh,'readall'):",
        "                    out.append('  has readall')",
        "                if hasattr(fh,'close'): fh.close()",
        "        except Exception as e: out.append('open(P,'+repr(mode)+')_ERR='+repr(str(e))[:200])",
        "    # D. walk_dir res:/ 看目录树 (限深度)",
        "    try:",
        "        wd = nxio3.walk_dir('res:/')",
        "        out.append('walk_dir(res:/) count='+str(len(wd) if wd is not None else 'None'))",
        "        if wd: out.append('  sample='+str(list(wd)[:8]))",
        "    except Exception as e: out.append('walk_dir_ERR='+repr(str(e))[:200])",
        "    # E. list_dir res:/",
        "    try:",
        "        ld = nxio3.list_dir('res:/')",
        "        out.append('list_dir(res:/) = '+str(ld[:15] if ld else ld))",
        "    except Exception as e: out.append('list_dir(res:/)_ERR='+repr(str(e))[:200])",
        "    # F. 实例化 NpkReader / NxFileIO 试用",
        "    try:",
        "        nr = nxio3.NxFileIO()",
        "        m2=[x for x in dir(nr) if not x.startswith('__')]",
        "        out.append('NxFileIO() instance methods='+str(m2))",
        "        for meth in ['open','read','read_file','load','get','read_bytes']:",
        "            if hasattr(nr,meth):",
        "                try:",
        "                    if meth=='open':",
        "                        for mm in ['rb','r',None]:",
        "                            try:",
        "                                fh = nr.open(P,mm) if mm else nr.open(P)",
        "                                out.append('  NxFileIO.open(P,'+repr(mm)+')='+str(type(fh)))",
        "                                if hasattr(fh,'read'): out.append('    read16='+repr(fh.read(16)))",
        "                                break",
        "                            except Exception as e: out.append('  NxFileIO.open(P,'+repr(mm)+')_ERR='+repr(str(e))[:120])",
        "                    else:",
        "                        r=getattr(nr,meth)(P)",
        "                        out.append('  NxFileIO.'+meth+'(P)='+str(type(r))+' len='+str(len(r) if r is not None else 0))",
        "                        if isinstance(r,(bytes,bytearray)): out.append('    head='+r[:16].hex())",
        "                except Exception as e: out.append('  NxFileIO.'+meth+'_ERR='+repr(str(e))[:120])",
        "    except Exception as e: out.append('NxFileIO instantiate_ERR='+repr(str(e))[:200])",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_probe_out = json.dumps(out)"
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil = PyGILState_Ensure();
    var rc = PyRun_SimpleString(code);
    log.push("rc=" + rc);
    if (rc == 0) {
        var mod = PyImport_AddModule(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = PyObject_GetAttrString(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = PyObject_Str(v);
                var cs = PyUnicode_AsUTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
            }
        }
    }
    PyGILState_Release(gil);
} catch(e) {
    log.push("JSERR=" + e + " stack=" + (e.stack||""));
}
send(JSON.stringify(log));
"""

done = [False]; res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"]); done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description", "")); done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach", pid[0], "...")
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
for _ in range(50):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE")
