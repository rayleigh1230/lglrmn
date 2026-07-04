"""精确 dump enhance_tree_dic (列+行坐标) 和 tree_index_enhance_node_object。
这是科技树布局的最终真相。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    if not trees:
        out.append("NO TREE INSTANCE")
    else:
        t = trees[0]
        out.append("ship_id=%s system_id=%s" % (t.ship_id, t.system_id))
        out.append("")
        out.append("=== enhance_tree_dic (列→节点列表, 含 ui_level 行号) ===")
        etd = getattr(t, "enhance_tree_dic", {})
        for col in sorted(etd.keys()):
            out.append("列%d:" % col)
            for item in etd[col]:
                out.append("  eid=%s parent=%s parent_list=%s ui_level=%s" % (
                    item.get("enhance_id"), item.get("parent_enhance_id"),
                    item.get("parent_enhance_id_list"), item.get("ui_level")))
        out.append("")
        out.append("=== sorted_enhance_id_list (排序后) ===")
        out.append(str(getattr(t, "sorted_enhance_id_list", [])))
        out.append("")
        out.append("=== tree_index_enhance_node_object 的 key 和对应 enhance_id ===")
        tino = getattr(t, "tree_index_enhance_node_object", {})
        for col in sorted(tino.keys()):
            eids = []
            for n in tino[col]:
                try:
                    eids.append(getattr(n, "enhance_id", "?"))
                except:
                    eids.append("?")
            out.append("列%d: %s" % (col, eids))
        out.append("")
        out.append("=== node_dict (key→节点, 看是否含坐标) ===")
        nd = getattr(t, "node_dict", {})
        out.append("node_dict keys=%s" % sorted(nd.keys())[:20])
        # 看第一个节点的完整属性(找x/y坐标字段)
        for k in sorted(nd.keys())[:1]:
            nodes_list = nd[k]
            if nodes_list:
                n = nodes_list[0]
                out.append("--- node_dict[%s][0] 属性 ---" % k)
                for name in sorted(dir(n)):
                    if name.startswith("_"):
                        continue
                    try:
                        val = getattr(n, name)
                        if callable(val):
                            continue
                        sval = str(val)
                        if len(sval) > 150:
                            sval = sval[:150] + "..."
                        out.append("  %s=%s" % (name, sval))
                    except:
                        pass
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_tree_probe3_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_tree_probe3_mod', tmpf)",
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
