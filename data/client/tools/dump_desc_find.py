"""找强化项描述渲染的真正入口。策略:
1. 搜所有模块含 '{101}' 或 '{P}' 字面常量的函数
2. 搜含 EFFECT_PARAM + replace/format 的函数
3. 直接调 system_effect 表的 DESC，看 {101} 怎么被填
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys
out = []
try:
    gc.collect()

    # 1. 搜所有函数找含 {101}/{P}/{T}/{C} 字面量 或 EFFECT_PARAM_LEVEL 解析
    out.append("=== 搜占位符渲染函数 ===")
    hits = []
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for fname in dir(m):
            try:
                fn = getattr(m, fname)
                co = getattr(fn, "__code__", None) or (hasattr(fn,"__func__") and getattr(fn.__func__,"__code__",None))
                if not co: continue
                cs = str(co.co_consts)
                # 命中条件: 含 {101} 字面 或 (EFFECT_PARAM + {) 或 ({P}/{T}/{C})
                hit = False
                if "{101}" in cs or "{P}" in cs or "{T}" in cs or "{C}" in cs: hit = True
                if "EFFECT_PARAM" in str(co.co_names) and "{" in cs: hit = True
                if hit:
                    hits.append((modname, fname, list(co.co_names)[:10], [str(c)[:50] for c in co.co_consts if isinstance(c,str) and len(c)<60][:6]))
            except: pass
    for modname, fname, names, consts in hits[:20]:
        out.append("★ %s.%s" % (modname, fname))
        out.append("  co_names=%s" % names)
        out.append("  consts=%s" % consts)

    # 2. 找 get_enhance_node_id_and_level (set_attr_data 里用的)
    import common.blueprint_utils as bu
    fn = getattr(bu, "get_enhance_node_id_and_level", None)
    if fn and hasattr(fn, "__code__"):
        co = fn.__code__
        out.append("")
        out.append("=== get_enhance_node_id_and_level ===")
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  co_consts=%s" % [str(c)[:70] for c in co.co_consts])

    # 3. 找描述详情面板类(点击节点弹出的)
    desc_cls = []
    for o in gc.get_objects():
        if isinstance(o, type):
            tn = type(o).__name__ if hasattr(type(o),"__name__") else ""
            cn = o.__name__
            if any(k in cn for k in ["EnhanceDetail","EnhanceInfo","EnhanceDesc","EnhanceExplain","SystemEnhanceDetail"]):
                desc_cls.append(cn)
    out.append("")
    out.append("=== 描述详情类 ===")
    out.append(str(set(desc_cls)))

    # 4. 直接试: 找 Tb_cfg_system_effect 取一条记录, 看 DESC 和 EFFECT_PARAM
    import common.preprocess_data as pd
    se = getattr(pd, "Tb_cfg_system_effect", None)
    if se:
        rec = se.get(920501) or se.get("920501")
        if rec:
            out.append("")
            out.append("=== cfg_system_effect[920501] (快速输出) ===")
            for name in sorted(dir(rec)):
                if name.startswith("_"): continue
                try:
                    v = getattr(rec, name)
                    if callable(v): continue
                    sv = str(v)[:80]
                    out.append("  %s=%s" % (name, sv))
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_find_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_find_mod', tmpf)",
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
