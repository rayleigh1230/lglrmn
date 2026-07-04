"""dump SystemEnhanceTree 和 EnhanceBasic 类的代码对象元数据(co_names/co_consts)，
找 ui_level / tree_index 的计算来源。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types
out = []
try:
    gc.collect()

    # 找 SystemEnhanceTree 类的代码对象
    tree_cls = None
    for o in gc.get_objects():
        if isinstance(o, type) and o.__name__ == "SystemEnhanceTree":
            tree_cls = o
            break
    if tree_cls:
        out.append("=== SystemEnhanceTree 类代码对象元数据 ===")
        # 遍历类的方法，找含 ui_level/tree_index/enhance_tree_dic 的
        for name in sorted(dir(tree_cls)):
            if name.startswith("__"): continue
            try:
                attr = getattr(tree_cls, name)
                # 找函数的 co_names/co_consts
                if hasattr(attr, "__func__"):
                    fn = attr.__func__
                elif isinstance(attr, types.FunctionType):
                    fn = attr
                else:
                    continue
                co = getattr(fn, "__code__", None)
                if not co: continue
                co_names = list(co.co_names)
                co_consts = [str(c)[:60] for c in co.co_consts]
                # 只输出含关键词的方法
                kws = ["ui_level", "tree_index", "enhance_tree_dic", "treeColumn", "tree_column", "ui_row", "sort"]
                if any(any(k in str(cn) for k in kws) for cn in co_names) or any(any(k in c for k in kws) for c in co_consts):
                    out.append("--- 方法 %s ---" % name)
                    out.append("  co_names=%s" % co_names)
                    out.append("  co_consts=%s" % co_consts)
            except:
                pass

    # 也找 EnhanceBasic / BlueprintSystemEnhancementData
    for cls_name in ["BlueprintSystemEnhancementData", "EnhanceBasic"]:
        cls = None
        for o in gc.get_objects():
            if isinstance(o, type) and o.__name__ == cls_name:
                cls = o; break
        if cls:
            out.append("")
            out.append("=== %s 类 ===" % cls_name)
            # 实例属性
            insts = [o for o in gc.get_objects() if type(o).__name__ == cls_name]
            if insts:
                inst = insts[0]
                for name in sorted(dir(inst)):
                    if name.startswith("_"): continue
                    try:
                        val = getattr(inst, name)
                        if callable(val): continue
                        sval = str(val)
                        if len(sval) > 150: sval = sval[:150]+"..."
                        out.append("  %s=%s" % (name, sval))
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enhance_codeobj_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enhance_codeobj_mod', tmpf)",
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
