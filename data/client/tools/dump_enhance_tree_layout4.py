"""dump 所有强化节点的 ui_level + EFFECT_LABEL，建立 label→ui_level 全局映射。
同时确认 tree_index 列号 = BFS hop。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    if trees:
        t = trees[0]
        tino = getattr(t, "tree_index_enhance_node_object", {})
        out.append("=== 所有节点 enhance_id / effect_id / ui_level / enhance_cost_list ===")
        for col in sorted(tino.keys()):
            for n in tino[col]:
                eid = getattr(n, "enhance_id", "?")
                eff = getattr(n, "effect_id", "?")
                cost = getattr(n, "enhance_cost_list", "?")
                unlocked = getattr(n, "is_unlocked", "?")
                out.append("  列%d eid=%s effect_id=%s cost=%s unlocked=%s" % (col, eid, eff, cost, unlocked))

        # enhance_tree_dic 里拿 ui_level
        out.append("")
        out.append("=== enhance_tree_dic ui_level 全集 ===")
        etd = getattr(t, "enhance_tree_dic", {})
        for col in sorted(etd.keys()):
            for item in etd[col]:
                out.append("  eid=%s ui_level=%s parent_list=%s" % (
                    item.get("enhance_id"), item.get("ui_level"), item.get("parent_enhance_id_list")))

    # 也 dump EnhanceSortWeight 看是否含 eid→weight 映射
    out.append("")
    out.append("=== EnhanceSortWeight 详情(找eid映射) ===")
    sws = [o for o in gc.get_objects() if type(o).__name__ == "EnhanceSortWeight"]
    for i, sw in enumerate(sws[:25]):
        attrs = {}
        for name in dir(sw):
            if name.startswith("_"): continue
            try:
                v = getattr(sw, name)
                if not callable(v): attrs[name] = v
            except: pass
        out.append("  SW[%d] %s" % (i, attrs))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_tree_probe4_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_tree_probe4_mod', tmpf)",
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
