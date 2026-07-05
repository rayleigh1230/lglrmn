"""找 enhance 配置记录表的正确访问方式, 然后批量 dump 描述。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, re, sys as _sys
out = []
try:
    gc.collect()

    # 找含 SYSTEM_EFFECT_PREFIX 的表对象
    out.append("=== 找 enhance 配置表 ===")
    found_tables = []
    for modname, m in list(_sys.modules.items()):
        if not m: continue
        for attr in dir(m):
            if "system_enhance" in attr.lower() or attr == "Tb_cfg_system_enhance":
                try:
                    t = getattr(m, attr)
                    # 试取一条看有没有 SYSTEM_EFFECT_PREFIX
                    if hasattr(t, "get"):
                        keys = list(t.keys())[:1] if hasattr(t,"keys") else []
                        if keys:
                            rec = t.get(keys[0])
                            if rec and hasattr(rec, "SYSTEM_EFFECT_PREFIX"):
                                found_tables.append((modname, attr))
                                if len(found_tables) <= 3:
                                    out.append("  ★ %s.%s (有SYSTEM_EFFECT_PREFIX)" % (modname, attr))
                except: pass
    if not found_tables:
        out.append("  没找到含SYSTEM_EFFECT_PREFIX的表, 试 game_data_utils")

    # 替代: 用 ShipSystemEnhanceView 实例的 enhance_cost_dic + all_effect_dic
    views = [o for o in gc.get_objects() if type(o).__name__ == "ShipSystemEnhanceView"]
    out.append("")
    out.append("ShipSystemEnhanceView 实例=%d" % len(views))
    if views:
        v = views[0]
        all_effect = getattr(v, "all_effect_dic", {})
        enhance_cost = getattr(v, "enhance_cost_dic", {})
        out.append("all_effect_dic 样例(前3): %s" % dict(list(all_effect.items())[:3]))
        out.append("enhance_cost_dic 样例(前3): %s" % dict(list(enhance_cost.items())[:3]))
        # all_effect_dic: {enhance_id: prefix} 正是我需要的!
        # enhance_cost_dic: {enhance_id: (cost_tuple)}

        import ui.ship_blueprint.bp_ui_utils as bpu
        desc_fn = getattr(bpu, "get_effect_desc", None)

        def clean(s):
            s = re.sub(r"#c[0-9a-fA-F]{6}", "", str(s))
            s = s.replace("#l","").replace("#n","").replace("#e","")
            return s.strip()

        result = {}
        cnt = 0
        for eid, prefix in all_effect.items():
            eid_str = str(eid)
            if len(eid_str) != 9 or not eid_str.startswith("40501"): continue
            optidx = int(eid_str[7:9])
            if optidx < 1 or optidx > 18: continue
            cost = enhance_cost.get(eid)
            if not cost or list(cost) == [0]: continue
            maxlv = len(cost)
            lv_desc = {}
            for lv in range(1, maxlv + 1):
                try:
                    rendered = desc_fn(prefix, maxlv, lv)
                    lv_desc[str(lv)] = clean(rendered)
                except Exception as e:
                    lv_desc[str(lv)] = "ERR:%s" % str(e)[:40]
            result[eid_str] = lv_desc
            cnt += 1
        out.append("")
        out.append("dump强化项数=%d" % cnt)
        out.append("RESULT_JSON=" + json.dumps(result, ensure_ascii=False))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_batch3_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_batch3_mod', tmpf)",
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
    payload = json.loads(res[0])
    for line in payload:
        if line.startswith("RESULT_JSON="):
            data = json.loads(line[len("RESULT_JSON="):])
            with open("data/client/config/enhance_desc_rendered.json", "w", encoding="utf-8") as fout:
                json.dump(data, fout, ensure_ascii=False, indent=2)
            print("★ 已写入 enhance_desc_rendered.json, 强化项数=%d" % len(data))
            for eid in list(data.keys())[:6]:
                print("  %s:" % eid)
                for lv, d in list(data[eid].items())[:2]:
                    print("    lv%s: %s" % (lv, d))
        else:
            print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r[:600])
