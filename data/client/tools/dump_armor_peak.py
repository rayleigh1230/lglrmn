"""抓斗牛装甲系统面板的实际 maxLevel + 巅峰扩展数据。
用户当前打开的是装甲系统(slot02)。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    # 抓 ShipSystemEnhanceView 实例
    views = [o for o in gc.get_objects() if type(o).__name__ == "ShipSystemEnhanceView"]
    out.append("ShipSystemEnhanceView 实例=%d" % len(views))
    for v in views[:2]:
        sid = getattr(v, "ship_id", "?")
        sysid = getattr(v, "system_id", "?")
        out.append("--- ship_id=%s system_id=%s ---" % (sid, sysid))
        # 关键: cur_enhance_level_dic (各强化项当前等级)
        celd = getattr(v, "cur_enhance_level_dic", {})
        out.append("  cur_enhance_level_dic=%s" % dict(list(celd.items())[:15]))
        # enhance_cost_dic
        ecd = getattr(v, "enhance_cost_dic", {})
        out.append("  enhance_cost_dic=%s" % dict(list(ecd.items())[:8]))

    # 抓 SystemEnhanceTree 实例的 enhance_tree_dic (含 ui_level)
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    out.append("")
    out.append("SystemEnhanceTree 实例=%d" % len(trees))
    for t in trees[:2]:
        sid = getattr(t, "system_id", "?")
        out.append("--- tree system_id=%s ---" % sid)
        # enhance_tree_dic
        etd = getattr(t, "enhance_tree_dic", {})
        out.append("  enhance_tree_dic keys=%s" % sorted(etd.keys())[:10])
        # cur_enhance_level_dic
        celd = getattr(t, "cur_enhance_level_dic", {})
        out.append("  cur_enhance_level_dic=%s" % dict(list(celd.items())[:15]))
        # peak_enhance_list
        pel = getattr(t, "peak_enhance_list", [])
        out.append("  peak_enhance_list=%s" % str(pel)[:200])

    # 也看节点的 maxLevel / is_peak
    nodes = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTreeEhanceNode"]
    out.append("")
    out.append("SystemEnhanceTreeEhanceNode 实例=%d" % len(nodes))
    for n in nodes[:10]:
        eid = getattr(n, "enhance_id", "?")
        # 找 maxLevel / peak 相关属性
        attrs = {}
        for name in dir(n):
            if name.startswith("_"): continue
            try:
                val = getattr(n, name)
                if callable(val): continue
                if any(k in name.lower() for k in ["max","level","peak","extra","adv","limit","cost"]):
                    attrs[name] = str(val)[:60]
            except: pass
        if attrs:
            out.append("  eid=%s %s" % (eid, attrs))

except Exception:
    out.append("ERR=" + traceback.format_exc()[:2000])
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_armor_peak_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_armor_peak_mod', tmpf)",
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
    for r in res: print(r[:600])
