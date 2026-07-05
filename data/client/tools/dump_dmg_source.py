"""查 prefix=105(强化充能功率) 的数值来源。
客户端 get_effect_desc 能渲染出'伤害提升2%', 但 system_effect 表里 EFFECT_PARAM=None。
查 EFFECT_DESC / EFFECT_DESC_LOWER / 其他字段, 以及 get_effect_desc 内部怎么取值。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    import common.preprocess_data as pd
    se = getattr(pd, "Tb_cfg_system_effect", None)
    # 找运行时表
    if not se:
        # 试 game_data_utils
        import data_manager.game_data_utils as gdu
        se = getattr(gdu, "Tb_cfg_system_effect", None)

    out.append("se 表存在=%s" % (se is not None))
    if se:
        # 试取 10501 全字段(运行时表可能有更多字段)
        for k in [10501, "10501", 10501]:
            rec = se.get(k) if hasattr(se,"get") else None
            if rec:
                out.append("=== 10501 运行时记录全字段 ===")
                for name in sorted(dir(rec)):
                    if name.startswith("_"): continue
                    try:
                        v = getattr(rec, name)
                        if callable(v): continue
                        sv = str(v)
                        if len(sv) > 80: sv = sv[:80]+"..."
                        out.append("  %s=%s" % (name, sv))
                    except: pass
                break

    # 直接调 get_effect_desc 看 lv1 渲染值, 反推数值
    import ui.ship_blueprint.bp_ui_utils as bpu
    fn = getattr(bpu, "get_effect_desc", None)
    if fn:
        for lv in [1,2,5]:
            r = fn(105, 5, lv)
            import re
            r2 = re.sub(r"#c[0-9a-fA-F]{6}","",str(r)).replace("#l","").replace("#n","")
            out.append("get_effect_desc(105,5,%d)=%s" % (lv, r2))

    # 找 get_cur_and_next_level_value (get_effect_desc 内部用的取值函数)
    fn2 = getattr(bpu, "get_cur_and_next_level_value", None)
    if fn2 and hasattr(fn2, "__code__"):
        co = fn2.__code__
        out.append("")
        out.append("=== get_cur_and_next_level_value ===")
        out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  consts=%s" % [str(c)[:60] for c in co.co_consts])
        # 调用试试
        try:
            v = fn2(105, 5, 1)
            out.append("  调用(105,5,1)=%s" % str(v)[:100])
        except Exception as e:
            out.append("  调用err=%s" % str(e)[:80])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_dmg_src_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_dmg_src_mod', tmpf)",
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
