"""frida 查武器的伤害类型(能量/实弹)字段来源。
对比 16041(君士坦丁M1,用户说是能量) vs 14016(火炮,实弹)。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    import common.preprocess_data as pd
    wt = getattr(pd, "Tb_cfg_weapon", None)
    if not wt:
        import data_manager.game_data_utils as gdu
        wt = getattr(gdu, "Tb_cfg_weapon", None)

    out.append("weapon表存在=%s" % (wt is not None))
    if wt:
        # 对比 16041 vs 14016 全字段
        for wid in [16041, 14016, 25006, 14037, 11231]:
            rec = wt.get(wid) if hasattr(wt,"get") else None
            if rec:
                out.append("--- weapon %s ---" % wid)
                for name in sorted(dir(rec)):
                    if name.startswith("_"): continue
                    try:
                        v = getattr(rec, name)
                        if callable(v): continue
                        sv = str(v)
                        if len(sv) > 80: sv = sv[:80]+"..."
                        out.append("  %s=%s" % (name, sv))
                    except: pass

    # 找伤害类型相关的字段/函数
    import sys as _sys
    out.append("")
    out.append("=== 找伤害类型(能量/实弹)判定 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        if not any(k in modname for k in ["weapon","battle","ship"]): continue
        for fname in dir(m):
            if any(k in fname.lower() for k in ["damage_type","is_energy","is_physical","energy_damage","weapon_category","get_damage"]):
                try:
                    fn = getattr(m, fname)
                    out.append("  %s.%s" % (modname, fname))
                    if hasattr(fn, "__code__"):
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dmg_type_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dmg_type_mod', tmpf)",
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
