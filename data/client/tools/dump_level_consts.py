"""dump SystemEnhanceTree 类的 LEVEL_* 常量 + get_system_enhance_tree 源码逻辑。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types, inspect
out = []
try:
    gc.collect()
    tree_cls = None
    for o in gc.get_objects():
        if isinstance(o, type) and o.__name__ == "SystemEnhanceTree":
            tree_cls = o; break
    if tree_cls:
        # 1. LEVEL_* 常量值
        out.append("=== LEVEL_* 常量 ===")
        for name in sorted(dir(tree_cls)):
            if name.startswith("LEVEL_"):
                try:
                    out.append("  %s = %s" % (name, getattr(tree_cls, name)))
                except: pass

        # 2. 找 get_system_enhance_tree 所在的模块(可能在 ShipBlueprintData 或 blueprint_utils)
        # 先看 SystemEnhanceTree 模块
        mod = inspect.getmodule(tree_cls)
        if mod:
            out.append("")
            out.append("=== SystemEnhanceTree 模块: %s ===" % mod.__name__)
            # 找 get_system_enhance_tree 函数
            for name in dir(mod):
                if name == "get_system_enhance_tree":
                    fn = getattr(mod, name)
                    co = getattr(fn, "__code__", None)
                    if co:
                        out.append("--- get_system_enhance_tree ---")
                        out.append("  co_names=%s" % list(co.co_names))
                        out.append("  co_consts=%s" % [str(c)[:80] for c in co.co_consts])

        # 3. 找 enhance_sort_weight / get_sort_all_enhance_id_list
        out.append("")
        out.append("=== 找排序相关函数 ===")
        # 在 blueprint_utils 模块找
        import sys as _sys
        for modname, m in list(_sys.modules.items()):
            if m and ("blueprint_utils" in modname or "ship_blueprint" in modname):
                for fname in ["get_sort_all_enhance_id_list", "enhance_sort_weight", "get_system_enhance_tree"]:
                    fn = getattr(m, fname, None)
                    if fn and hasattr(fn, "__code__"):
                        co = fn.__code__
                        kws = ["ui_level", "tree_index", "LEVEL", "sort", "treeColumn", "tree_column"]
                        if any(any(k in str(cn) for k in kws) for cn in co.co_names) or any(any(k in str(c) for k in kws) for c in [str(x) for x in co.co_consts]):
                            out.append("--- %s.%s ---" % (modname, fname))
                            out.append("  co_names=%s" % list(co.co_names))
                            out.append("  co_consts=%s" % [str(c)[:80] for c in co.co_consts])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_level_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_level_mod', tmpf)",
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
