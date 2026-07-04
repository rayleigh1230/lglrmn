"""dump 强化科技树布局实例 —— 用户正打开斗牛武器系统强化页。
通过 gc.get_objects() 扫描所有存活实例，找含 enhance/tree/column/node 语义的对象，
dump 其属性以发现"列顺序"等渲染层硬编码字段。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, sys, gc
out = []
try:
    gc.collect()

    # 收集所有实例的类名，找含关键词的
    KEYW = ["enhance", "tree", "intensify", "strengthen", "tech_node", "system_scheme", "bp_system"]
    seen_classes = {}
    for o in gc.get_objects():
        try:
            tn = type(o).__name__
            tn_low = tn.lower()
        except:
            continue
        if any(k in tn_low for k in KEYW):
            seen_classes.setdefault(tn, 0)
            seen_classes[tn] += 1

    out.append("=== 匹配关键词的类 ===")
    for tn, cnt in sorted(seen_classes.items(), key=lambda x: -x[1])[:40]:
        out.append("  %s: %d 个实例" % (tn, cnt))

    # 对每个匹配类，取第一个实例 dump 属性
    out.append("")
    out.append("=== 各类实例属性样例 ===")
    dumped = set()
    for o in gc.get_objects():
        try:
            tn = type(o).__name__
        except:
            continue
        if tn in seen_classes and tn not in dumped:
            dumped.add(tn)
            out.append("--- %s ---" % tn)
            # dump 非下划线属性
            for name in sorted(dir(o)):
                if name.startswith("_"):
                    continue
                try:
                    val = getattr(o, name)
                    if callable(val):
                        continue
                    sval = str(val)
                    if len(sval) > 120:
                        sval = sval[:120] + "..."
                    out.append("  %s=%s" % (name, sval))
                except:
                    pass
            if len(dumped) >= 15:
                break

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_tree_probe_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_tree_probe_mod', tmpf)",
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
