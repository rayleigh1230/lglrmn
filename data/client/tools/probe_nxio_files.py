"""
阶段0.2a-2: 探测 nxio3 虚拟文件系统的实际可用方法
目的: 确认能否用 nxio3 的 load_file/open/list_dir 读取 res_*.npk 里的图标 PNG。

策略: 在游戏解释器里执行, 试探这些方法在真实图标路径上的行为。
保留 _probe_out 契约 (字符串JSON), 复用 inject_probe3 的注入骨架。
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
        "    import nxio3",
        "    # 1. 方法签名: load_file / open / list_dir / walk_dir / exists",
        "    import inspect",
        "    for fn in ['load_file','open','list_dir','walk_dir','exists','is_dir','load_package','is_package_loaded','list_loaded_packages','list_all_packages','get_package_config','get_filesystem_config','get_package_path']:",
        "        f = getattr(nxio3, fn, None)",
        "        if f is None: out.append(fn+'=MISSING'); continue",
        "        try: out.append(fn+' sig='+str(inspect.signature(f)))",
        "        except Exception as e: out.append(fn+' sig_err='+str(e))",
        "    # 2. 已加载的包",
        "    try: out.append('loaded_packages='+str(nxio3.list_loaded_packages()))",
        "    except Exception as e: out.append('loaded_packages_err='+str(e))",
        "    try: out.append('all_packages='+str(nxio3.list_all_packages()[:20]))",
        "    except Exception as e: out.append('all_packages_err='+str(e))",
        "    # 3. 试读已知路径: 缓存里有的 icon_system_intensify_235.png",
        "    test_paths = [",
        "        'cocosui/_resource/icon/system_intensify_new/icon_system_intensify_235.png',",
        "        'cocosui/_resource/icon/system_intensify_new',",
        "        'cocosui/_resource/icon',",
        "        'cocosui',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_dodge.png',",
        "    ]",
        "    for p in test_paths:",
        "        # exists?",
        "        try: ex = nxio3.exists(p)",
        "        except Exception as e: ex='ERR:'+str(e)",
        "        out.append('exists('+repr(p)+')='+str(ex))",
        "        # list_dir?",
        "        try:",
        "            ld = nxio3.list_dir(p)",
        "            out.append('list_dir('+repr(p)+')='+str(ld[:8] if ld else ld))",
        "        except Exception as e: out.append('list_dir('+repr(p)+')_err='+str(e))",
        "    # 4. 试读文件字节 (load_file)",
        "    for p in ['cocosui/_resource/icon/system_intensify_new/icon_system_intensify_235.png']:",
        "        try:",
        "            data = nxio3.load_file(p)",
        "            out.append('load_file('+repr(p)+') type='+str(type(data)).split(chr(39))[1]+' len='+str(len(data) if data is not None else 0))",
        "            if isinstance(data,(bytes,bytearray)) and len(data)>=8:",
        "                out.append('  first8='+data[:8].hex())",
        "        except Exception as e: out.append('load_file('+repr(p)+')_err='+repr(str(e))[:200])",
        "        # open?",
        "        try:",
        "            fh = nxio3.open(p,'rb')",
        "            out.append('open('+repr(p)+')='+str(fh)+ ' type='+str(type(fh)))",
        "            if fh is not None:",
        "                head = fh.read(8) if hasattr(fh,'read') else None",
        "                out.append('  read8='+repr(head))",
        "                if hasattr(fh,'close'): fh.close()",
        "        except Exception as e: out.append('open('+repr(p)+')_err='+repr(str(e))[:200])",
        "    # 5. 路径前缀方案: 试 res:/ script:/ 等虚拟根",
        "    for prefix in ['res:/','script:/','res://','resource:/','assets:/','']:",
        "        p2 = prefix+'cocosui/_resource/icon/system_intensify_new/icon_system_intensify_235.png'",
        "        try: ex2=nxio3.exists(p2)",
        "        except Exception as e: ex2='ERR:'+str(e)[:60]",
        "        out.append('exists('+repr(p2)+')='+str(ex2))",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_probe_out = json.dumps(out)"
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil = PyGILState_Ensure();
    var rc = PyRun_SimpleString(code);
    log.push("PyRun_SimpleString rc=" + rc);
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
        res.append("JSERR:" + m.get("description", "") + " | " + m.get("stack", "")); done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid:
    print("NO_GAME"); exit()
print("attach", pid[0], "...")
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
for _ in range(40):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE")
