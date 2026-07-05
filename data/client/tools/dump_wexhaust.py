"""彻底dump武器记录的所有字段——用多种方式访问(属性/items/dir/__slots__)。
之前_record只有10个字段, 可能遗漏了伤害类型/弹道类型字段。
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

    if wt:
        rec = wt.get(16041) if hasattr(wt, "get") else None
        if rec:
            out.append("=== weapon 16041 全字段穷举 ===")
            # 1. _record 完整(不截断)
            r = rec.__dict__.get("_record", {})
            out.append("_record keys=%s" % sorted(r.keys()))
            out.append("_record 完整=%s" % json.dumps(r, ensure_ascii=False, default=str))
            out.append("")

            # 2. _default_record (可能有更多字段定义)
            dr = rec.__dict__.get("_default_record", {})
            out.append("_default_record keys=%s" % sorted(dr.keys()))
            out.append("_default_record=%s" % json.dumps(dr, ensure_ascii=False, default=str))
            out.append("")

            # 3. rec.__dict__ 完整
            out.append("__dict__ keys=%s" % sorted(rec.__dict__.keys()))
            out.append("")

            # 4. 试 getattr 所有 CfgWeaponField 定义的字段名
            import data_manager.game_data_utils as gdu
            cls = getattr(gdu, "CfgWeaponField", None)
            if cls:
                field_names = [getattr(cls, n) for n in dir(cls) if not n.startswith("_") and isinstance(getattr(cls, n), str)]
                out.append("试访问所有CfgWeaponField字段:")
                for fn in sorted(field_names):
                    try:
                        v = getattr(rec, fn, None)
                        if v is not None and str(v) != "":
                            out.append("  %s=%s" % (fn, str(v)[:80]))
                    except: pass

            # 5. 试用 rec["field_name"] 或 rec.field_name 方式访问已知的伤害类型候选名
            out.append("")
            out.append("试伤害类型候选字段名:")
            candidates = ["damage_type","DAMAGE_TYPE","hurt_type","HURT_TYPE","attack_type","ATTACK_TYPE",
                          "ballistic_type","BALLISTIC_TYPE","trajectory","TRAJECTORY","bullet_type","BULLET_TYPE",
                          " projectile","PROJECTILE","fire_mode","FIRE_MODE","DAMAGE_CATEGORY","damage_category"]
            for cn in candidates:
                try:
                    v = getattr(rec, cn, None)
                    if v is not None:
                        out.append("  ★ getattr(%s)=%s" % (cn, str(v)[:80]))
                except: pass
                try:
                    v = rec[cn] if hasattr(rec, "__getitem__") else None
                    if v is not None:
                        out.append("  ★ [%s]=%s" % (cn, str(v)[:80]))
                except: pass
            # 也试 _record 里用小写key
            for cn in candidates:
                vl = cn.lower()
                if vl in r:
                    out.append("  ★ _record[%s]=%s" % (vl, str(r[vl])[:80]))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_wexhaust_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_wexhaust_mod', tmpf)",
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
