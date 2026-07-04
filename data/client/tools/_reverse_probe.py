"""逆向探索 data.ship_attr_calc 模块的代码对象。

策略：
1. 取模块的代码对象（co_names/co_consts），看函数引用的属性名和常量
2. 对含 repair 的函数，dump 它的 co_names（引用的变量/属性名）和 co_consts（常量）
3. 尝试 dis.dis 反汇编（可能因 opcode 重映射失败，但试一下）
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, sys, types, inspect
out = []
try:
    import data.ship_attr_calc as sac

    # 递归搜索所有代码对象，找含 repair_adjust 的
    def search_code(code, path, depth=0):
        if depth > 5:
            return
        try:
            names = list(code.co_names) + list(code.co_varnames)
            all_str = " ".join(str(n) for n in names)
            if "repair_adjust" in all_str.lower() or "DISPLAY_ARMOR" in all_str or "armor_used" in all_str.lower():
                out.append("HIT %s co_names=%s" % (path, list(code.co_names)))
                simple = [c for c in code.co_consts if isinstance(c, (int, float, str, bool))]
                out.append("  co_consts=%s" % simple)
                out.append("  co_varnames=%s" % list(code.co_varnames))
        except:
            pass
        # 递归嵌套
        for c in code.co_consts:
            if hasattr(c, "co_names"):
                search_code(c, path + ".nested", depth + 1)

    # 搜索模块级函数
    for name in sorted(dir(sac)):
        if name.startswith("_"):
            continue
        obj = getattr(sac, name)
        if callable(obj) and hasattr(obj, "__code__"):
            search_code(obj.__code__, name)
        elif isinstance(obj, type):  # 类
            for mname in sorted(dir(obj)):
                if mname.startswith("_"):
                    continue
                m = getattr(obj, mname, None)
                if callable(m):
                    func = getattr(m, "__func__", m)
                    if hasattr(func, "__code__"):
                        search_code(func.__code__, name + "." + mname)

    out.append("--- search complete ---")

    # 如果没找到，dump DISPLAY_ARMOR_USED 的值和所有含 armor 的常量
    for name in sorted(dir(sac)):
        if "armor" in name.lower() or "repair" in name.lower() or "display" in name.lower():
            obj = getattr(sac, name)
            if isinstance(obj, (int, float, str)):
                out.append("CONST %s = %r" % (name, obj))

except Exception:
    out.append("ERR=" + traceback.format_exc()[:1500])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_reverse_probe_mod.py')",
    "with open(tmpf, 'w') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_reverse_probe_mod', tmpf)",
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
            for d in json.loads(line[7:]): print("  "+str(d))
        else: print("  "+line)
except Exception as e:
    print("err:",e)
    for r in res: print(r)
