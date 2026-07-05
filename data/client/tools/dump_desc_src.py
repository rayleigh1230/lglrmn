"""dump 占位符数值来源: 对比 get_effect_desc 返回值 vs system_effect 表字段。
弄清 {101}/{P}/{T}/{C} 的值从哪个字段算出。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, re
out = []
try:
    gc.collect()
    import common.preprocess_data as pd
    import ui.ship_blueprint.bp_ui_utils as bpu
    fn = getattr(bpu, "get_effect_desc", None)

    se = getattr(pd, "Tb_cfg_system_effect", None)
    # 测试样例: prefix, max_lv, lv
    cases = [
        (109, 4, 2, "高斯线圈强化"),
        (9205, 1, 1, "快速输出"),
        (105, 5, 3, "强化充能功率"),
    ]
    for prefix, maxlv, lv, label in cases:
        out.append("=== %s (prefix=%s, lv=%s) ===" % (label, prefix, lv))
        # 1. get_effect_desc 返回
        try:
            desc = fn(prefix, maxlv, lv)
            out.append("  渲染结果: %s" % str(desc)[:200])
        except Exception as e:
            out.append("  渲染err: %s" % e)
        # 2. 原始 system_effect[prefix+01] 全字段
        rec = se.get(int(str(prefix)+"01")) if se else None
        if rec:
            for name in sorted(dir(rec)):
                if name.startswith("_"): continue
                try:
                    v = getattr(rec, name)
                    if callable(v): continue
                    sv = str(v)
                    if len(sv) > 100: sv = sv[:100]+"..."
                    out.append("  表.%s = %s" % (name, sv))
                except: pass
        out.append("")

    # 3. 关键: 看 get_effect_desc 内部怎么取值
    # 从 co_consts 看到 EFFECT_DESC/EFFECT_PARAM, 这些可能是记录上的字段
    # 试: 取 10901 的 EFFECT_PARAM 和 EFFECT_DESC
    out.append("=== 10901 关键字段(高斯线圈 lv2渲染出5%) ===")
    rec = se.get(10901) if se else None
    if rec:
        for k in ["EFFECT_PARAM","EFFECT_DESC","EFFECT_DESC_LOWER","EFFECT_NAME","EFFECT_NAME_LOWER","EFFECT_WEAPON","EFFECT_WEAPON_LOWER","EFFECT_PARAM_LEVEL","DESC","DESC_INDEX"]:
            try:
                v = getattr(rec, k, None)
                out.append("  %s = %s" % (k, v))
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_src_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_src_mod', tmpf)",
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
