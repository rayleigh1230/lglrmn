"""dump 强化项描述渲染——找占位符{101}{P}{T}{C}的解析。
从 SystemEnhanceTreeEhanceNode / DescHelperTipsHandler / 蓝图UI 抓渲染后的描述文本。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types, inspect
out = []
try:
    gc.collect()

    # 1. 找 DescHelperTipsHandler (之前dump里看到 main_page_cls.helper_handler)
    handlers = [o for o in gc.get_objects() if "DescHelper" in type(o).__name__]
    out.append("DescHelper类实例: %d" % len(handlers))
    for h in handlers[:2]:
        out.append("--- %s ---" % type(h).__name__)
        cls = type(h)
        # dump 方法(找含 desc/text/format/replace 的)
        for name in sorted(dir(cls)):
            if name.startswith("_"): continue
            try:
                attr = getattr(cls, name)
                fn = getattr(attr, "__func__", attr)
                if hasattr(fn, "__code__"):
                    co = fn.__code__
                    kws = ["desc","text","format","replace","{","placeholder","PARAM","EFFECT_PARAM","render","101"]
                    if any(any(k in str(cn) for k in kws) for cn in co.co_names) or any("{" in str(c) for c in co.co_consts):
                        out.append("  方法 %s:" % name)
                        out.append("    co_names=%s" % list(co.co_names))
                        out.append("    co_consts=%s" % [str(c)[:80] for c in co.co_consts])
            except: pass

    # 2. 找节点实例, 看有没有 desc_text / rendered_desc 属性
    nodes = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTreeEhanceNode"]
    out.append("")
    out.append("SystemEnhanceTreeEhanceNode 实例=%d" % len(nodes))
    if nodes:
        n = nodes[0]
        eid = getattr(n, "enhance_id", "?")
        out.append("  enhance_id=%s" % eid)
        # 找含 desc/text/label 的属性
        for name in sorted(dir(n)):
            if name.startswith("_"): continue
            try:
                val = getattr(n, name)
                if callable(val): continue
                sval = str(val)
                if ("desc" in name.lower() or "text" in name.lower() or "label" in name.lower() or "info" in name.lower()) and len(sval) < 300:
                    out.append("  %s=%s" % (name, sval))
            except: pass

    # 3. 找 system_effect 表的访问方法——可能有个 get_desc(eid) 把占位符填了
    # 搜所有函数找含 "replace" + "{" 的
    import sys as _sys
    checked = set()
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        if not any(k in modname for k in ["ship_blueprint","system_enhance","blueprint_utils","desc","effect"]): continue
        for fname in dir(m):
            if fname in checked: continue
            try:
                fn = getattr(m, fname)
                if hasattr(fn, "__code__"):
                    co = fn.__code__
                    if "{" in str(co.co_consts) and ("replace" in co.co_names or "format" in co.co_names):
                        out.append("")
                        out.append("★ %s.%s (含{和replace/format)" % (modname, fname))
                        out.append("  co_names=%s" % list(co.co_names)[:15])
                        out.append("  co_consts=%s" % [str(c)[:60] for c in co.co_consts][:10])
                        checked.add(fname)
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_render_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_render_mod', tmpf)",
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
