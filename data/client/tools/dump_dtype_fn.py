"""找武器详情面板怎么取伤害类型值。
搜含 '伤害类型' 或 damage_type 的渲染函数 + 调用试。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys
out = []
try:
    gc.collect()
    # 搜含 '伤害类型' co_consts 的函数
    out.append("=== 搜含'伤害类型'的函数 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            try:
                fn = getattr(m, attr)
                co = getattr(fn, "__code__", None) or (hasattr(fn,"__func__") and getattr(fn.__func__,"__code__",None))
                if not co: continue
                cs = str(co.co_consts)
                if "伤害类型" in cs or "弹道类型" in cs:
                    out.append("★ %s.%s" % (modname, attr))
                    out.append("  co_names=%s" % list(co.co_names)[:15])
                    out.append("  consts=%s" % [str(c)[:60] for c in co.co_consts if isinstance(c,(str,int))][:8])
            except: pass

    # 也搜 get_damage_type / damage_category 类函数
    out.append("")
    out.append("=== 搜 damage_category / weapon_category 函数 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            al = attr.lower()
            if any(k in al for k in ["damage_category","weapon_category","get_weapon_category","hurt_type","damage_class"]):
                try:
                    fn = getattr(m, attr)
                    out.append("  %s.%s" % (modname, attr))
                    if hasattr(fn,"__code__"):
                        out.append("    co_names=%s" % list(fn.__code__.co_names)[:10])
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dtype_fn_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dtype_fn_mod', tmpf)",
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
