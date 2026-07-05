"""批量 dump 强化项描述: 调用 get_effect_desc 渲染所有强化项所有等级。
输出 enhanceId + level → 渲染文本(去富文本标记) 的映射表。

策略:
- 遍历当前船(40501)所有系统的强化项
- 对每个强化项的每个等级(1..maxLevel)调用 get_effect_desc
- 去掉 #cXXXXXX/#l/#n 富文本标记, 留纯文本
- 输出 JSON: {enhanceId: {level: 渲染文本}}
"""
import frida, time, json, sys, re

PROBE_CODE = '''
import json, traceback, gc, re
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu
    import common.preprocess_data as pd
    desc_fn = getattr(bpu, "get_effect_desc", None)
    enh_tbl = getattr(pd, "Tb_cfg_system_enhance", None)
    if not desc_fn or not enh_tbl:
        out.append("缺函数/表")
    else:
        # 富文本清洗: 去 #cXXXXXX/#l/#n/#e 等标记
        def clean(s):
            s = re.sub(r"#c[0-9a-fA-F]{6}", "", str(s))
            s = s.replace("#l","").replace("#n","").replace("#e","").replace("#E(event)","")
            return s.strip()

        # 遍历 40501 所有强化项
        result = {}
        cnt = 0
        for eid_str in list(enh_tbl.keys()):
            try:
                eid = int(eid_str)
            except:
                continue
            if not str(eid).startswith("40501") or len(str(eid)) != 9:
                continue
            rec = enh_tbl.get(eid)
            if not rec: continue
            prefix = getattr(rec, "SYSTEM_EFFECT_PREFIX", 0)
            cost = getattr(rec, "ENHANCE_COST", None)
            if not prefix or not cost:
                continue
            maxlv = len(cost)
            optidx = int(str(eid)[7:9])
            # 只取普通强化 optIdx 1-18, 排除调校/旗舰
            if optidx < 1 or optidx > 18: continue
            if cost == [0]: continue

            lv_desc = {}
            for lv in range(1, maxlv + 1):
                try:
                    rendered = desc_fn(prefix, maxlv, lv)
                    lv_desc[str(lv)] = clean(rendered)
                except Exception as e:
                    lv_desc[str(lv)] = "ERR:%s" % str(e)[:50]
            result[str(eid)] = lv_desc
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_batch_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_batch_mod', tmpf)",
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
            # 存到文件
            with open("data/client/config/enhance_desc_rendered.json", "w", encoding="utf-8") as fout:
                json.dump(data, fout, ensure_ascii=False, indent=2)
            print("已写入 enhance_desc_rendered.json, 强化项数=%d" % len(data))
            # 打印几个样例
            for eid in list(data.keys())[:4]:
                print("  %s: %s" % (eid, data[eid]))
        else:
            print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r[:500])
