"""frida 查武器的伤害类型(能量/实弹)。
方法: 找客户端战斗计算时怎么判定 weapon 的 damage_type。
搜 WeaponField / weapon 配置里的伤害类型字段。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys
out = []
try:
    gc.collect()

    # 方法1: 搜所有模块里 damage_type 相关的字段/函数
    out.append("=== 搜 damage_type / is_energy / 能量武器 判定 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            al = attr.lower()
            if any(k in al for k in ["is_energy_weapon","is_physical_weapon","get_damage_type","weapon_damage_type","is_energy_damage","get_weapon_damage_type"]):
                try:
                    fn = getattr(m, attr)
                    out.append("  ★ %s.%s" % (modname, attr))
                    if hasattr(fn, "__code__"):
                        out.append("    co_names=%s" % list(fn.__code__.co_names)[:12])
                        # 试调用
                        try:
                            r = fn(16041)
                            out.append("    调用(16041)=%s" % str(r)[:60])
                        except: pass
                except: pass

    # 方法2: 搜 TARGET_MODULE_TYPE 匹配逻辑
    out.append("")
    out.append("=== 搜 TARGET_MODULE_TYPE 匹配 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        if not any(k in modname for k in ["weapon","battle","blueprint","effect","module"]): continue
        for attr in dir(m):
            try:
                fn = getattr(m, attr)
                if hasattr(fn, "__code__"):
                    co = fn.__code__
                    if "TARGET_MODULE_TYPE" in str(co.co_names) or "target_module_type" in str(co.co_names):
                        out.append("  ★ %s.%s" % (modname, attr))
                        out.append("    co_names=%s" % list(co.co_names)[:15])
            except: pass

    # 方法3: 看 weapon 表记录怎么访问(之前的dir()为空,试别的)
    import common.preprocess_data as pd
    wt = getattr(pd, "Tb_cfg_weapon", None)
    if wt:
        rec = wt.get(16041) if hasattr(wt,"get") else None
        if rec:
            out.append("")
            out.append("=== weapon 16041 记录(试 dict/items) ===")
            try:
                out.append("  dict=%s" % str(dict(rec))[:200] if hasattr(rec,"items") else "no items")
            except: pass
            try:
                out.append("  str=%s" % str(rec)[:200])
            except: pass
            # 试用 co_names 查记录类
            cls = type(rec)
            out.append("  类=%s" % cls.__name__)

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dtype2_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dtype2_mod', tmpf)",
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
