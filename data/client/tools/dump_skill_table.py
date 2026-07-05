"""深入 get_desc_attr_value_ex + CFG_SKILL_TABLE_VALUE，搞清伤害类强化(105/106)数值来源。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, re
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu

    # 1. get_desc_attr_value_ex 完整代码对象
    fn = getattr(bpu, "get_desc_attr_value_ex", None)
    if fn and hasattr(fn, "__code__"):
        co = fn.__code__
        out.append("=== get_desc_attr_value_ex ===")
        out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
        out.append("  co_names=%s" % list(co.co_names))
        out.append("  consts=%s" % [repr(c)[:80] for c in co.co_consts])

    # 2. CFG_SKILL_TABLE_VALUE 是什么(常量/函数?)
    v = getattr(bpu, "CFG_SKILL_TABLE_VALUE", None)
    out.append("")
    out.append("CFG_SKILL_TABLE_VALUE=%s" % (repr(v)[:200] if v else "None"))

    # 3. 直接调用 get_desc_attr_value_ex 试试(从签名反推参数)
    # get_cur_and_next_level_value 调它时传: system_effect_prefix, key_config, level
    # key_config 可能是 desc 里的占位符 key (如 "101")
    if fn:
        for key in ["101", "102", "P", "T", "C"]:
            try:
                # 试不同参数组合
                r = fn(105, key, 1)
                out.append("get_desc_attr_value_ex(105,%s,1)=%s" % (key, r))
            except Exception as e:
                out.append("get_desc_attr_value_ex(105,%s,1) err=%s" % (key, str(e)[:60]))

    # 4. 找 cfg_skill_table / Tb_cfg_skill 相关表
    import sys as _sys
    out.append("")
    out.append("=== 找 skill_table 表 ===")
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            if "skill_table" in attr.lower() or "SKILL_TABLE" in attr:
                try:
                    t = getattr(m, attr)
                    s = str(t)[:120]
                    out.append("  %s.%s = %s" % (modname, attr, s))
                except: pass

    # 5. get_cur_and_next_level_value 完整签名+尝试调用(补全参数)
    fn2 = getattr(bpu, "get_cur_and_next_level_value", None)
    if fn2 and hasattr(fn2, "__code__"):
        co = fn2.__code__
        out.append("")
        out.append("=== get_cur_and_next_level_value 全签名 ===")
        out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
        out.append("  co_names=%s" % list(co.co_names))
        # 试调用: prefix, key_config, level, add_level, max_level
        try:
            r = fn2(105, "101", 1, 0, 5)
            out.append("  调用(105,'101',1,0,5)=%s" % str(r)[:150])
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_skill_tbl_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_skill_tbl_mod', tmpf)",
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
