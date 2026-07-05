"""frida 从武器装配实例抓 damageType。
搜 weapon_system / WeaponSystem 类的实例, 看有没有 damage_type/hurt_type 属性。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    # 找武器系统实例(战斗层装配的武器)
    weapon_instances = []
    for o in gc.get_objects():
        try:
            tn = type(o).__name__
            if "Weapon" in tn and "System" in tn:
                weapon_instances.append(o)
            elif tn in ("Weapon", "WeaponInfo", "WeaponData", "WeaponConfig"):
                weapon_instances.append(o)
        except: pass

    out.append("武器相关实例=%d" % len(weapon_instances))
    # dump 含 damage/hurt/energy 属性的实例
    for o in weapon_instances[:20]:
        tn = type(o).__name__
        attrs = {}
        for name in dir(o):
            if name.startswith("_"): continue
            try:
                v = getattr(o, name)
                if callable(v): continue
                sv = str(v)[:60]
                if any(k in name.lower() for k in ["damage","hurt","energy","kinetic","type","ballistic","trajectory","projectile"]):
                    attrs[name] = sv
            except: pass
        if attrs:
            wid = getattr(o, "weapon_id", getattr(o, "id", "?"))
            out.append("  %s wid=%s %s" % (tn, wid, attrs))

    # 也找 weapon_system 模块的定义
    import sys as _sys
    out.append("")
    out.append("=== 搜 weapon_system 模块的伤害类型 ===")
    for modname, m in list(_sys.modules.items()):
        if "weapon_system" not in modname and "weapon" not in modname.lower(): continue
        for attr in dir(m):
            al = attr.lower()
            if any(k in al for k in ["damage_type","hurt_type","is_energy","get_damage_type","damage_category"]):
                try:
                    fn = getattr(m, attr)
                    out.append("  %s.%s" % (modname, attr))
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_winst_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_winst_mod', tmpf)",
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
