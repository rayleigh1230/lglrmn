"""
阶段0.2a-4: 枚举 res_*.npk 里的完整文件名列表
已知: nxio3.load_file('res:/path') 返回解密bytes。
还需: 完整文件名列表, 才知道要提取哪些图标路径。

探测 NpkReader 的实例化方式 + get_filenames_list()
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
        "    # A. NpkReader 实例化探索",
        "    try:",
        "        nr = nxio3.NpkReader()",
        "        out.append('NpkReader() OK')",
        "    except Exception as e: out.append('NpkReader()_ERR='+repr(str(e))[:150])",
        "    # B. 直接用 nxio3 模块级方法看能否枚举",
        "    # walk_dir 返回嵌套列表, 解析结构",
        "    try:",
        "        wd = nxio3.walk_dir('res:/')",
        "        out.append('walk_dir(res:/) type='+str(type(wd))+' len='+str(len(wd)))",
        "        # 看结构: 可能是 [(dir,[files],[subdirs]),...]",
        "        if wd:",
        "            for i,item in enumerate(wd[:2]):",
        "                out.append('  ['+str(i)+'] type='+str(type(item))+' len='+str(len(item) if hasattr(item,'__len__') else '?')+' repr='+repr(item)[:200])",
        "    except Exception as e: out.append('walk_dir_ERR='+repr(str(e))[:150])",
        "    # C. walk_dir 更深 - 限定遍历 cocosui 目录",
        "    for d in ['res:/cocosui','res:/cocosui/_resource','res:/cocosui/_resource/icon']:",
        "        try:",
        "            w = nxio3.walk_dir(d)",
        "            cnt = 0",
        "            sample = []",
        "            # walk_dir可能返回生成器或列表",
        "            try:",
        "                for root,dirs,files in (w if isinstance(w,list) else []):",
        "                    for f in files:",
        "                        cnt+=1",
        "                        if len(sample)<6: sample.append(root+'/'+f if root else f)",
        "            except Exception:",
        "                sample=['(unpack failed) repr='+repr(w)[:300]]",
        "                cnt = len(w) if hasattr(w,'__len__') else '?'",
        "            out.append('walk_dir('+d+') files='+str(cnt)+' sample='+str(sample))",
        "        except Exception as e: out.append('walk_dir('+d+')_ERR='+repr(str(e))[:150])",
        "    # D. list_dir 递归试 - 它可能返回字符串列表",
        "    try:",
        "        ld = nxio3.list_dir('res:/cocosui/_resource/icon/system_intensify_new')",
        "        out.append('list_dir(system_intensify_new)='+str(ld))",
        "    except Exception as e: out.append('list_dir_ERR='+repr(str(e))[:150])",
        "    # E. 用内置 open 读已确认文件, 验证walk_dir给的路径格式",
        "    testp = 'res:/cocosui/_resource/icon/system_intensify_new/icon_system_intensify_235.png'",
        "    try:",
        "        b = nxio3.load_file(testp)",
        "        out.append('load_file('+testp+') bytes len='+str(len(b))+' head='+b[:8].hex())",
        "    except Exception as e: out.append('load_file_ERR='+repr(str(e))[:150])",
        "    # F. 试 wildcard 或目录下文件列举: 用 list_dir 看父目录",
        "    for d in ['res:/cocosui/_resource/icon/system_intensify_new/','res:/cocosui/_resource/icon/ship_system_effect/']:",
        "        try:",
        "            ld = nxio3.list_dir(d)",
        "            out.append('list_dir('+repr(d)+')='+str(ld if not ld or len(ld)<=12 else ld[:12]+['...('+str(len(ld))+'total)']))",
        "        except Exception as e: out.append('list_dir('+repr(d)+')_ERR='+repr(str(e))[:150])",
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
