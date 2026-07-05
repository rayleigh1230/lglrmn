"""frida 抓运行时武器实例的 damageType。
方法: 找 ShipAttribute/weapon_socket 里的武器实例, 看有没有 damage_type/is_energy 属性。
或直接调客户端的伤害类型判定函数。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, sys as _sys
out = []
try:
    gc.collect()

    # 方法1: 找 weapon 相关实例(含 damage_type 属性)
    out.append("=== 搜含 damage_type 属性的实例 ===")
    found = 0
    for o in gc.get_objects():
        try:
            tn = type(o).__name__
            if "Weapon" in tn or "weapon" in tn.lower():
                dt = getattr(o, "damage_type", None) or getattr(o, "damageType", None)
                if dt is not None:
                    wid = getattr(o, "weapon_id", getattr(o, "id", "?"))
                    out.append("  %s wid=%s damage_type=%s" % (tn, wid, dt))
                    found += 1
                    if found >= 10: break
        except: pass
    out.append("  找到 %d 个含damage_type的武器实例" % found)

    # 方法2: 找 weapon 的配置记录(运行时表), 用 __getitem__ 或索引访问
    import common.preprocess_data as pd
    wt = getattr(pd, "Tb_cfg_weapon", None)
    if wt:
        rec = wt.get(16041) if hasattr(wt, "get") else None
        if rec:
            out.append("")
            out.append("=== weapon 16041 记录(索引访问) ===")
            # 试用数字索引访问字段
            for i in range(20):
                try:
                    v = rec[i]
                    if v is not None and str(v) != "":
                        out.append("  [%d]=%s" % (i, str(v)[:60]))
                except: break
            # 试 __dict__
            try:
                d = dict(rec)
                out.append("  dict=%s" % str(d)[:200])
            except: pass

    # 方法3: 找 ShipAttribute 的 weapon_socket_dict (装配的武器)
    for o in gc.get_objects():
        if hasattr(o, "weapon_socket_dict"):
            wsd = getattr(o, "weapon_socket_dict")
            out.append("")
            out.append("=== weapon_socket_dict ===")
            out.append("  type=%s" % type(wsd).__name__)
            try:
                for k,v in list(wsd.items())[:5]:
                    out.append("  %s: %s" % (k, str(v)[:100]))
            except: pass
            break

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dtype3_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dtype3_mod', tmpf)",
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
