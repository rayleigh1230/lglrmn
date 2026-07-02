"""
阶段0.2a-9: 从 cfg_ship_attr 获取真实舰船图标路径
cfg_ship_attr.get(ship_id) 应返回含 ICON/BLUEPRINT_ICON/MODEL 字段的记录
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
        "    from common.config.client_cfg import cfg_ship_attr",
        "    # 1. 常量值",
        "    for c in ['ICON','BLUEPRINT_ICON','MODEL','MODEL_NAME','CSB_FILE','SUB_INDEX']:",
        "        try: out.append(c+' = '+repr(getattr(cfg_ship_attr,c)))",
        "        except Exception as e: out.append(c+' ERR: '+repr(str(e))[:60])",
        "    # 2. get(ship_id) 取数据",
        "    test_ids = [80201,40501,70121,30401,7012,10201]",
        "    for sid in test_ids:",
        "        try:",
        "            rec = cfg_ship_attr.get(sid)",
        "            if rec is None: out.append('get('+str(sid)+')=None'); continue",
        "            # rec可能是dict或对象, 取icon相关字段",
        "            info = {}",
        "            for k in ['ICON','BLUEPRINT_ICON','MODEL','MODEL_NAME']:",
        "                kv = getattr(cfg_ship_attr, k) if isinstance(getattr(cfg_ship_attr,k,None), int) else k",
        "                try:",
        "                    v = rec[kv] if hasattr(rec,'__getitem__') else getattr(rec,k,None)",
        "                    if v is not None: info[k]=repr(v)[:80]",
        "                except Exception: pass",
        "            out.append('ship '+str(sid)+': '+str(info))",
        "        except Exception as e: out.append('get('+str(sid)+')_ERR: '+repr(str(e))[:100])",
        "    # 3. get_all_data 看结构",
        "    try:",
        "        alldata = cfg_ship_attr.get_all_data()",
        "        keys = list(alldata.keys())[:5] if hasattr(alldata,'keys') else str(type(alldata))",
        "        out.append('get_all_data keys sample: '+str(keys))",
        "        if keys and hasattr(alldata,'__getitem__'):",
        "            first=alldata[keys[0]]",
        "            out.append('first record type='+str(type(first))+' attrs='+str([x for x in dir(first) if not x.startswith('_')][:20] if hasattr(first,'__dir__') else 'N/A'))",
        "            if hasattr(first,'__getitem__') or hasattr(first,'keys'):",
        "                out.append('first record content: '+repr(dict(first) if hasattr(first,'keys') else list(first))[:300])",
        "    except Exception as e: out.append('get_all_data ERR: '+repr(str(e))[:100])",
        "    # 4. 一旦拿到ICON字段值, 验证路径能读",
        "    # 先试常见格式",
        "    test_paths_to_verify = []",
        "    for sid in [80201, 40501]:",
        "        try:",
        "            rec = cfg_ship_attr.get(sid)",
        "            if rec:",
        "                ICON=cfg_ship_attr.ICON",
        "                BP=cfg_ship_attr.BLUEPRINT_ICON",
        "                MODEL=cfg_ship_attr.MODEL",
        "                for field,label in [(ICON,'ICON'),(BP,'BLUEPRINT_ICON'),(MODEL,'MODEL')]:",
        "                    try:",
        "                        val = rec[field] if hasattr(rec,'__getitem__') else None",
        "                        if val:",
        "                            test_paths_to_verify.append((sid,label,str(val)))",
        "                    except: pass",
        "        except: pass",
        "    out.append('paths to verify: '+str(test_paths_to_verify))",
        "    for sid,label,val in test_paths_to_verify:",
        "        # val可能是纯文件名或相对路径, 试多种前缀",
        "        candidates=[val, 'cocosui/_resource/'+val, 'cocosui/_resource/icon/'+val,",
        "                    'cocosui/_resource/painting2d/'+val, 'cocosui/_resource/cg/'+val]",
        "        for c in candidates:",
        "            p='res:/'+c",
        "            try:",
        "                if nxio3.exists(p):",
        "                    b=nxio3.load_file(p)",
        "                    out.append('  VERIFIED ship'+str(sid)+' '+label+': '+p+' (len='+str(len(b))+')')",
        "                    break",
        "            except: pass",
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
