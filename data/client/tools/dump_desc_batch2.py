"""修正: 用正确的表访问方式批量 dump 强化项描述。
表在 ui.ship_blueprint.system_enhance_tree 模块的 SYSTEM_ENHANCE_DATA,
或通过 common.preprocess_data.Tb_cfg_system_enhance。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, re, sys as _sys
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu
    desc_fn = getattr(bpu, "get_effect_desc", None)

    # 找 enhance 表: 试多种来源
    enh_data = None
    # 来源1: ui.ship_blueprint.system_enhance_tree.SYSTEM_ENHANCE_DATA
    import ui.ship_blueprint.system_enhance_tree as setree
    enh_data = getattr(setree, "SYSTEM_ENHANCE_DATA", None)
    out.append("SYSTEM_ENHANCE_DATA 类型=%s, 内容样例=%s" % (type(enh_data).__name__, str(enh_data)[:150] if enh_data else "None"))

    # 来源2: common.preprocess_data
    if not enh_data:
        import common.preprocess_data as pd
        for attr in ["Tb_cfg_system_enhance", "SYSTEM_ENHANCE"]:
            t = getattr(pd, attr, None)
            if t:
                enh_data = t
                out.append("用 %s.%s" % ("pd", attr))
                break

    if not desc_fn:
        out.append("缺 get_effect_desc")
    elif not enh_data:
        out.append("缺 enhance 表")
    else:
        def clean(s):
            s = re.sub(r"#c[0-9a-fA-F]{6}", "", str(s))
            s = s.replace("#l","").replace("#n","").replace("#e","")
            return s.strip()

        # SYSTEM_ENHANCE_DATA 是 defaultdict(list), key=system_id, value=enhance_id 列表
        # 还需要 enhance 配置记录(含 SYSTEM_EFFECT_PREFIX/ENHANCE_COST)
        # 用 Tb_cfg_system_enhance 取记录
        import common.preprocess_data as pd
        cfg_enh = getattr(pd, "Tb_cfg_system_enhance", None)
        out.append("Tb_cfg_system_enhance=%s" % (cfg_enh is not None))

        result = {}
        cnt = 0
        # 遍历 40501 的 system_id → enhance_id 列表
        ship_prefix = "40501"
        for sys_id, eid_list in (enh_data.items() if hasattr(enh_data,"items") else []):
            if not str(sys_id).startswith(ship_prefix): continue
            for eid in eid_list:
                eid_str = str(eid)
                if len(eid_str) != 9: continue
                optidx = int(eid_str[7:9])
                if optidx < 1 or optidx > 18: continue
                rec = cfg_enh.get(eid) if cfg_enh else None
                if not rec: continue
                prefix = getattr(rec, "SYSTEM_EFFECT_PREFIX", 0)
                cost = getattr(rec, "ENHANCE_COST", None)
                if not prefix or not cost or cost == [0]: continue
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_batch2_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_batch2_mod', tmpf)",
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
            print("已写入 enhance_desc_rendered.json, 强化项数=%d" % len(data))
            for eid in list(data.keys())[:5]:
                print("  %s:" % eid)
                for lv, d in list(data[eid].items())[:2]:
                    print("    lv%s: %s" % (lv, d))
        else:
            print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r[:600])
