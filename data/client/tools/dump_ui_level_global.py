"""dump 多个系统槽的 ui_level 全集 + 列内顺序，找全局行槽位规则。
用户需切换不同船/系统让实例存在。当前实例是 4050101。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    # 收集所有 SystemEnhanceTree 实例（可能多个系统槽）
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    out.append("SystemEnhanceTree 实例数=%d" % len(trees))
    for ti, t in enumerate(trees):
        sid = getattr(t, "system_id", "?")
        out.append("")
        out.append("=== Tree[%d] system_id=%s ===" % (ti, sid))
        tino = getattr(t, "tree_index_enhance_node_object", {})
        etd = getattr(t, "enhance_tree_dic", {})
        # 收集所有 ui_level
        all_uil = []
        for col in sorted(tino.keys()):
            for n in tino[col]:
                eid = getattr(n, "enhance_id", "?")
                # 从 etd 找 ui_level
                uil = None
                for k, items in etd.items():
                    for item in items:
                        if item.get("enhance_id") == eid:
                            uil = item.get("ui_level")
                            break
                all_uil.append(uil)
        out.append("  ui_level 全集(去重排序): %s" % sorted(set(all_uil)))
        # 每列节点顺序 + ui_level
        for col in sorted(tino.keys()):
            parts = []
            for n in tino[col]:
                eid = getattr(n, "enhance_id", "?")
                uil = None
                for k, items in etd.items():
                    for item in items:
                        if item.get("enhance_id") == eid:
                            uil = item.get("ui_level")
                parts.append("%s(ui%s)" % (str(eid)[-2:], uil))
            out.append("  列%d: %s" % (col, " → ".join(parts)))
except Exception:
    out.append("ERR=" + traceback.format_exc()[:2500])
probe_result = json.dumps(out, ensure_ascii=False, default=str)
'''

JS = r"""
var log=[];
try {
  var py=Process.getModuleByName("python311.dll");
  var f=function(n){return py.getExportByName(n);};
  var Ens=new NativeFunction(f("PyGILState_Ensure"),'pointer',[]);
  var Rel=new NativeFunction(f("PyGILState_Release"),'void',['pointer']);
  var Run=new NativeFunction(f("PyRun_SimpleString"),'int',['pointer']);
  var AddM=new NativeFunction(f("PyImport_AddModule"),'pointer',['pointer']);
  var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
  var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
  var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);
  var codeStr = CODE_PLACEHOLDER;
  var pyCode = [
    "import importlib.util, sys, os, tempfile",
    "code = " + JSON.stringify(codeStr),
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_uilvl_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_uilvl_mod', tmpf)",
    "mod = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(mod)",
  ].join("\n");
  var c=Memory.allocUtf8String(pyCode);
  var g=Ens(); var rc=Run(c);
  log.push("rc="+rc);
  if(rc==0){
    var m=AddM(Memory.allocUtf8String("__main__"));
    var v=GetA(m, Memory.allocUtf8String("mod"));
    if(!v.isNull()){
      var v2=GetA(v, Memory.allocUtf8String("probe_result"));
      if(!v2.isNull()){var s=Str(v2);var u=UTF8(s);if(!u.isNull())log.push("RESULT="+u.readUtf8String());}
    }
  }
  Rel(g);
} catch(e){log.push("JSERR="+e);}
send(JSON.stringify(log));
""".replace("CODE_PLACEHOLDER", json.dumps(PROBE_CODE))

done=[False];res=[]
def on_msg(m,d):
    if m["type"]=="send":res.append(m["payload"]);done[0]=True
    elif m["type"]=="error":res.append("ERR:"+m.get("description",""));done[0]=True
ps=[p for p in frida.get_local_device().enumerate_processes() if "lagrange" in p.name.lower()]
if not ps: print("NO_GAME");sys.exit(1)
print("attach",ps[0].pid)
s=frida.attach(ps[0].pid).create_script(JS);s.on("message",on_msg);s.load()
for _ in range(120):
    if done[0]:break
    time.sleep(0.5)
if not res: print("TIMEOUT");sys.exit(1)
try:
    for line in json.loads(res[0]):
        if line.startswith("RESULT="):
            for d in json.loads(line[7:]): print(str(d))
        else: print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r)
