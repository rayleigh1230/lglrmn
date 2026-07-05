"""直接调用 bp_ui_utils.get_effect_desc 实测占位符替换。
用 prefix=9205(快速输出 DESC含{P}{101}{T}{C}) + prefix=109(高斯线圈 DESC含{101})。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu
    fn = getattr(bpu, "get_effect_desc", None)
    out.append("get_effect_desc 存在=%s" % (fn is not None))

    # 试调用: 不同 prefix + level
    # 签名: get_effect_desc(system_effect_prefix, max_level, enhance_level, ...)
    # 后面参数有默认值, 先只传3个必填
    for prefix, max_lv, lv, label in [
        (109, 4, 2, "高斯线圈强化(伤害) prefix=109"),
        (9205, 1, 1, "快速输出(策略) prefix=9205"),
        (105, 5, 3, "强化充能功率 prefix=105"),
        (199, 5, 2, "防空识别 prefix=199"),
    ]:
        try:
            # 试最少参数
            result = fn(prefix, max_lv, lv)
            out.append("★ %s: get_effect_desc(%s,%s,%s) =" % (label, prefix, max_lv, lv))
            out.append("  %s" % str(result)[:300])
        except Exception as e:
            out.append("  %s 调用err(3参): %s" % (label, str(e)[:120]))
            # 试加 value_color 参数
            try:
                result = fn(prefix, max_lv, lv, 0, 0, 0, 0, 0, 0, 0, "#cE8A027", "#cE8A027")
                out.append("  ★(全参)%s = %s" % (label, str(result)[:300]))
            except Exception as e2:
                out.append("  全参err: %s" % str(e2)[:120])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_call_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_call_mod', tmpf)",
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
