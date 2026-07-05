"""深入 dump get_effect_desc (占位符替换核心) + ParsedEnhanceDesc。
get_effect_desc 含 {[a-zA-Z0-9]+} 正则 + EFFECT_PARAM + re —— 这是替换{101}的函数。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys, inspect
out = []
try:
    gc.collect()

    # 1. get_effect_desc 完整代码对象
    import ui.ship_blueprint.bp_ui_utils as bpu
    fn = getattr(bpu, "get_effect_desc", None)
    if fn and hasattr(fn, "__code__"):
        co = fn.__code__
        out.append("=== get_effect_desc ===")
        out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
        out.append("  co_varnames=%s" % list(co.co_varnames))
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  co_consts=%s" % [repr(c)[:90] for c in co.co_consts])

    # 2. 实际调用 get_effect_desc 试试(用 9205 快速输出)
    out.append("")
    out.append("=== 调用 get_effect_desc 实测 ===")
    import common.preprocess_data as pd
    # 试几种参数组合
    try:
        # 看签名
        import inspect
        sig = inspect.getargspec(fn) if fn else None
        out.append("  argspec=%s" % str(sig))
    except Exception as e:
        out.append("  argspec err=%s" % e)

    # 3. ParsedEnhanceDesc 类
    ped_cls = None
    for o in gc.get_objects():
        if isinstance(o, type) and o.__name__ == "ParsedEnhanceDesc":
            ped_cls = o; break
    if ped_cls:
        out.append("")
        out.append("=== ParsedEnhanceDesc 类 ===")
        out.append("  模块=%s" % (inspect.getmodule(ped_cls).__name__ if inspect.getmodule(ped_cls) else "?"))
        for name in sorted(dir(ped_cls)):
            if name.startswith("_"): continue
            try:
                attr = getattr(ped_cls, name)
                fn2 = getattr(attr, "__func__", attr)
                if hasattr(fn2, "__code__"):
                    co = fn2.__code__
                    if any(k in str(co.co_names)+str(co.co_consts) for k in ["{","replace","PARAM","re","desc","101"]):
                        out.append("  方法 %s:" % name)
                        out.append("    co_names=%s" % list(co.co_names)[:12])
                        out.append("    consts=%s" % [repr(c)[:60] for c in co.co_consts if isinstance(c,(str,int))][:8])
            except: pass
        # 实例属性
        insts = [o for o in gc.get_objects() if type(o).__name__=="ParsedEnhanceDesc"]
        if insts:
            out.append("  实例属性样例:")
            inst = insts[0]
            for name in sorted(dir(inst)):
                if name.startswith("_"): continue
                try:
                    v = getattr(inst, name)
                    if callable(v): continue
                    sv = str(v)[:80]
                    out.append("    %s=%s" % (name, sv))
                except: pass

    # 4. SystemEnhanceDetailInfo 类
    sedi_cls = None
    for o in gc.get_objects():
        if isinstance(o, type) and o.__name__ == "SystemEnhanceDetailInfo":
            sedi_cls = o; break
    if sedi_cls:
        out.append("")
        out.append("=== SystemEnhanceDetailInfo 类 ===")
        for name in sorted(dir(sedi_cls)):
            if name.startswith("_"): continue
            try:
                attr = getattr(sedi_cls, name)
                fn2 = getattr(attr, "__func__", attr)
                if hasattr(fn2, "__code__"):
                    co = fn2.__code__
                    if any(k in str(co.co_names)+str(co.co_consts) for k in ["desc","{","replace","PARAM","get_effect_desc"]):
                        out.append("  方法 %s:" % name)
                        out.append("    co_names=%s" % list(co.co_names)[:12])
                        out.append("    consts=%s" % [repr(c)[:60] for c in co.co_consts if isinstance(c,(str,int))][:6])
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_core_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_core_mod', tmpf)",
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
