"""深入 dump EnhanceSortWeight + SystemEnhanceTree + 节点布局。
重点找列顺序规则。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()

    def dump_obj(o, label, max_attrs=200):
        out.append("--- %s (type=%s) ---" % (label, type(o).__name__))
        cnt = 0
        for name in sorted(dir(o)):
            if name.startswith("_"):
                continue
            try:
                val = getattr(o, name)
                if callable(val):
                    continue
                sval = str(val)
                if len(sval) > 200:
                    sval = sval[:200] + "..."
                out.append("  %s=%s" % (name, sval))
                cnt += 1
                if cnt >= max_attrs:
                    out.append("  ...(truncated)")
                    break
            except:
                pass

    # 1. SystemEnhanceTree (树本身)
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    out.append("★ SystemEnhanceTree 实例数=%d" % len(trees))
    for i, t in enumerate(trees[:2]):
        dump_obj(t, "SystemEnhanceTree[%d]" % i, 300)

    # 2. EnhanceSortWeight (排序权重)
    sws = [o for o in gc.get_objects() if type(o).__name__ == "EnhanceSortWeight"]
    out.append("")
    out.append("★ EnhanceSortWeight 实例数=%d" % len(sws))
    for i, sw in enumerate(sws[:5]):
        dump_obj(sw, "EnhanceSortWeight[%d]" % i, 50)

    # 3. SystemEnhanceTreeEhanceNode (节点)
    nodes = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTreeEhanceNode"]
    out.append("")
    out.append("★ SystemEnhanceTreeEhanceNode 实例数=%d" % len(nodes))
    for i, n in enumerate(nodes[:3]):
        dump_obj(n, "Node[%d]" % i, 100)

    # 4. cur_enhance_list 完整顺序 (从 ShipSystemEnhanceView)
    views = [o for o in gc.get_objects() if type(o).__name__ == "ShipSystemEnhanceView"]
    for v in views[:1]:
        out.append("")
        out.append("★ ShipSystemEnhanceView 关键数据 ===")
        for attr in ["cur_enhance_list", "all_enhance_list", "cur_enhance_level_dic"]:
            try:
                val = getattr(v, attr, None)
                out.append("  %s=%s" % (attr, val))
            except Exception as e:
                out.append("  %s err=%s" % (attr, e))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_tree_probe2_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_tree_probe2_mod', tmpf)",
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
      else log.push("no probe_result");
    } else log.push("no mod");
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
