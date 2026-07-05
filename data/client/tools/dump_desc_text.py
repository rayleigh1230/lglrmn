"""抓 SystemEnhanceTreeEhanceNode 的 text_type_1/text_type_2 字符串值
+ 找占位符替换函数(含 {101} / {P} 模式的 replace)。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types, sys as _sys
out = []
try:
    gc.collect()
    nodes = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTreeEhanceNode"]
    out.append("节点实例=%d" % len(nodes))
    # 抓每个节点的 text_type_1/2 字符串
    for n in nodes[:6]:
        eid = getattr(n, "enhance_id", "?")
        out.append("--- enhance_id=%s ---" % eid)
        for attr in ["text_type_1", "text_type_2", "text_desc", "text_name", "label_desc"]:
            try:
                val = getattr(n, attr, None)
                if val is not None:
                    # ccui.Text 用 getString 取文本
                    s = None
                    try:
                        s = val.getString()
                    except:
                        try: s = str(val)
                        except: s = "(无法取值)"
                    if s and len(str(s)) < 200:
                        out.append("  %s = %s" % (attr, s))
            except Exception as e:
                out.append("  %s err=%s" % (attr, str(e)[:60]))

    # 找占位符替换函数: 含 "{101}" 或 re.sub + "{"
    out.append("")
    out.append("=== 找占位符替换函数 ===")
    checked = set()
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        if not any(k in modname for k in ["ship_blueprint","enhance","effect","desc","blueprint","common"]): continue
        for fname in dir(m):
            key = modname+"."+fname
            if key in checked: continue
            checked.add(key)
            try:
                fn = getattr(m, fname)
                if hasattr(fn, "__code__"):
                    co = fn.__code__
                    consts_str = str(co.co_consts)
                    # 含 {数字} 或 {P}/{T}/{C} 模式 + replace/sub
                    has_placeholder = ("{" in consts_str and any(c in consts_str for c in ["101","{P}","{T}","{C}","{0}","{1}"]))
                    has_replace = "replace" in co.co_names or "sub" in co.co_names
                    if has_placeholder and has_replace:
                        out.append("★ %s.%s" % (modname, fname))
                        out.append("  co_names=%s" % list(co.co_names)[:12])
                        out.append("  co_consts=%s" % [str(c)[:70] for c in co.co_consts][:8])
            except: pass
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_text_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_text_mod', tmpf)",
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
