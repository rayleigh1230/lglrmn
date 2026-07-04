"""dump get_sort_enhance_id_list + enhance_weight_dict + ENHANCE_TREE_ONE_NODE_INFO。
这是排序的核心逻辑。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types, inspect
out = []
try:
    gc.collect()
    import common.blueprint_utils as bu
    out.append("=== common.blueprint_utils 排序相关 ===")

    # 1. ENHANCE_TREE_ONE_NODE_INFO 常量
    for name in dir(bu):
        if "ENHANCE_TREE" in name or "enhance_weight" in name.lower() or "ENHANCE_WEIGHT" in name:
            try:
                val = getattr(bu, name)
                sval = str(val)
                if len(sval) > 300: sval = sval[:300] + "..."
                out.append("  %s = %s" % (name, sval))
            except: pass

    # 2. get_sort_enhance_id_list 完整 co_names/co_consts
    fn = getattr(bu, "get_sort_enhance_id_list", None)
    if fn and hasattr(fn, "__code__"):
        co = fn.__code__
        out.append("")
        out.append("--- get_sort_enhance_id_list ---")
        out.append("  co_varnames=%s" % list(co.co_varnames))
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  co_consts=%s" % [str(c)[:100] for c in co.co_consts])

    # 3. get_system_enhance_tree (生成 enhance_tree_dic 的函数)
    fn2 = getattr(bu, "get_system_enhance_tree", None)
    if fn2 and hasattr(fn2, "__code__"):
        co = fn2.__code__
        out.append("")
        out.append("--- get_system_enhance_tree ---")
        out.append("  co_varnames=%s" % list(co.co_varnames))
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  co_consts=%s" % [str(c)[:100] for c in co.co_consts])

    # 4. enhance_weight_dict 实例(从 ShipSystemEnhanceView 或 tree 找)
    trees = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTree"]
    if trees:
        t = trees[0]
        ew = getattr(t, "enhance_sort_weight", None) or getattr(t, "enhance_weight_dict", None)
        if ew:
            out.append("")
            out.append("=== enhance_sort_weight/weight_dict 实例 ===")
            out.append(str(ew)[:500])

    # 5. 找 LEVEL_ENHANCE_* 常量(在模块层)
    import ui.ship_blueprint.system_enhance_tree as setree
    out.append("")
    out.append("=== ui.ship_blueprint.system_enhance_tree 模块常量 ===")
    for name in sorted(dir(setree)):
        if "LEVEL" in name or "ENHANCE" in name.upper() and not name.startswith("_"):
            try:
                val = getattr(setree, name)
                if isinstance(val, (int, float, str, tuple, list, dict)):
                    sval = str(val)
                    if len(sval) > 150: sval = sval[:150]+"..."
                    out.append("  %s = %s" % (name, sval))
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_sort_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_sort_mod', tmpf)",
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
