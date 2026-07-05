"""搜客户端代码里能量/实弹伤害类型的判定逻辑。
搜 CfgWeaponField / weapon 相关的 DAMAGE / energy / physical 字段定义。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys
out = []
try:
    gc.collect()
    # 搜含 damage/energy/physical 的字段定义
    hits = []
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            al = attr.lower()
            if any(k in al for k in ["damage_type","energy_damage","physical_damage","is_energy","weapon_damage_type","DamageType"]):
                try:
                    v = getattr(m, attr)
                    hits.append((modname, attr, str(v)[:80]))
                except: pass
    out.append("=== 伤害类型相关 ===")
    for modname, attr, val in hits[:20]:
        out.append("  %s.%s = %s" % (modname, attr, val))

    # 搜 CfgWeaponField 里的字段(武器配置字段字典)
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            if attr in ["CfgWeaponField","WeaponField","CfgWeaponTechField"]:
                try:
                    cls = getattr(m, attr)
                    # dump 所有属性
                    fields = []
                    for name in dir(cls):
                        if name.startswith("_"): continue
                        try:
                            v = getattr(cls, name)
                            if isinstance(v, str):
                                fields.append((name, v))
                        except: pass
                    if fields:
                        out.append("")
                        out.append("=== %s.%s 字段 ===" % (modname, attr))
                        for name, v in fields:
                            if any(k in v.upper() for k in ["DAMAGE","ENERGY","PHYSICAL","TYPE","CATEGORY","HURT","ELEMENT"]):
                                out.append("  %s=%s" % (name, v))
                except: pass

    # 也看 weapon_tech_class(武器技术分类)
    import common.preprocess_data as pd
    wtc = getattr(pd, "Tb_cfg_weapon_tech_class", None)
    if wtc:
        out.append("")
        out.append("=== weapon_tech_class 全部 ===")
        for k in sorted(wtc.keys(), key=str)[:15]:
            out.append("  %s: %s" % (k, wtc[k]))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dmg_field_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dmg_field_mod', tmpf)",
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
