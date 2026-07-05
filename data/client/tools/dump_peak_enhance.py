"""dump get_system_peak_enhance + get_enhancement_peak_extra_max_level
理解巅峰等级如何提升普通强化项的最大等级。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, inspect
out = []
try:
    gc.collect()
    import common.blueprint_utils as bu

    for fname in ["get_system_peak_enhance", "get_enhancement_peak_extra_max_level", "get_enhancement_max_level"]:
        fn = getattr(bu, fname, None)
        if fn and hasattr(fn, "__code__"):
            co = fn.__code__
            out.append("=== %s ===" % fname)
            out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
            out.append("  co_names=%s" % list(co.co_names)[:15])
            out.append("  consts=%s" % [str(c)[:70] for c in co.co_consts][:8])

    # 找运行时的 peak_enhance 实例(SystemEnhanceTree.peak_enhance_list)
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    if trees:
        t = trees[0]
        pe = getattr(t, "peak_enhance_list", [])
        out.append("")
        out.append("=== peak_enhance_list (system_id=%s) ===" % getattr(t,"system_id","?"))
        out.append("  %s" % str(pe)[:200])

    # 看 blueprint_utils 里 peak 相关的常量
    out.append("")
    out.append("=== peak 相关常量 ===")
    for name in dir(bu):
        if "PEAK" in name.upper() or "EXTRA" in name.upper():
            try:
                v = getattr(bu, name)
                if not callable(v):
                    out.append("  %s=%s" % (name, str(v)[:100]))
            except: pass
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_peak_enh_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_peak_enh_mod', tmpf)",
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
