"""批量 dump 强化项数值: 调用 get_cur_and_next_level_value 取每个强化项每级的 (当前值, EFFECT_ID)。
解决 3774 个 PARAM 全空的伤害类强化数值来源问题。

输出 enhanceId + level → {value, effect_id} 映射, 供 resolver 使用。
"""
import frida, time, json, sys, os, tempfile

# 读离线 enhance 配置 + system_effect DESC, 收集 (eid, prefix, maxlv, keys)
enh_cfg = json.load(open("data/client/config/cfg_system_enhance.json", encoding="utf-8"))
eff_cfg = json.load(open("data/client/config/cfg_system_effect.json", encoding="utf-8"))
import re
tasks = []
for eid_str, rec in enh_cfg.items():
    if len(eid_str) != 9: continue
    optidx = int(eid_str[7:9])
    if optidx < 1 or optidx > 18: continue
    prefix = rec.get("SYSTEM_EFFECT_PREFIX")
    cost = rec.get("ENHANCE_COST")
    if not prefix or not cost or cost == [0]: continue
    # 从 DESC 提取占位符 key
    base = eff_cfg.get(f"{prefix}01", {})
    desc = base.get("DESC", "") or ""
    keys = re.findall(r"{([a-zA-Z0-9]+)}", desc)
    tasks.append((eid_str, prefix, len(cost), keys))

print("待dump强化项数:", len(tasks))

# 写 tasks 到临时文件
tasks_file = os.path.join(tempfile.gettempdir(), "_enh_value_tasks.json")
with open(tasks_file, "w", encoding="utf-8") as tf:
    json.dump(tasks, tf, ensure_ascii=False)

PROBE_CODE = '''
import json, traceback, gc, os, tempfile, re
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu
    import common.preprocess_data as pd

    desc_fn = getattr(bpu, "get_effect_desc", None)
    value_fn = getattr(bpu, "get_cur_and_next_level_value", None)
    se_tbl = getattr(pd, "Tb_cfg_system_effect", None)

    # 从 DESC 提取占位符 key
    def extract_keys(prefix):
        if not se_tbl: return []
        rec = se_tbl.get(int(str(prefix)+"01")) or se_tbl.get(str(prefix)+"01")
        if not rec: return []
        desc = getattr(rec, "DESC", "") or ""
        return re.findall(r"[a-zA-Z0-9]+", desc.replace(" ", "")) if False else re.findall(r"{([a-zA-Z0-9]+)}", desc)

    tasks_file = os.path.join(tempfile.gettempdir(), "_enh_value_tasks.json")
    with open(tasks_file, "r", encoding="utf-8") as tf:
        tasks = json.load(tf)

    result = {}
    err_cnt = 0
    for eid_str, prefix, maxlv, keys in tasks:
        prefix_int = int(prefix)
        lv_data = {}
        for lv in range(1, maxlv + 1):
            entry = {"value": 0, "effect_id": None}
            try:
                if keys and value_fn:
                    # 对每个 key 调 get_cur_and_next_level_value, 取第一个非零
                    for key in keys:
                        try:
                            cur_next = value_fn(prefix_int, key, lv, 0, maxlv)
                            val = cur_next[0] if isinstance(cur_next, (tuple,list)) else cur_next
                            if val:
                                entry["value"] = val
                                break
                        except: pass
                # get_desc_attr_value_ex 拿 effect_id
                fn_ex = getattr(bpu, "get_desc_attr_value_ex", None)
                if fn_ex and keys:
                    for key in keys:
                        try:
                            r = fn_ex(prefix_int, key, lv)
                            if isinstance(r, (tuple,list)) and len(r) >= 2 and r[1]:
                                entry["effect_id"] = r[1]
                                if not entry["value"] and r[0]:
                                    entry["value"] = r[0]
                                break
                        except: pass
            except Exception as e:
                err_cnt += 1
            lv_data[str(lv)] = entry
        result[eid_str] = lv_data
    out.append("完成=%d 项, err=%d" % (len(result), err_cnt))
    out_file = os.path.join(tempfile.gettempdir(), "_enh_value_result.json")
    with open(out_file, "w", encoding="utf-8") as of:
        json.dump(result, of, ensure_ascii=False)
    out.append("RESULT_FILE=" + out_file)
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_enh_value_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_enh_value_mod', tmpf)",
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
for _ in range(600):
    if done[0]:break
    time.sleep(0.5)
if not res: print("TIMEOUT");sys.exit(1)
try:
    payload = json.loads(res[0])
    result_file = None
    for line in payload:
        if isinstance(line, str) and line.startswith("RESULT="):
            inner = json.loads(line[7:])
            for il in inner:
                if isinstance(il, str):
                    if il.startswith("RESULT_FILE="):
                        result_file = il[len("RESULT_FILE="):]
                    else:
                        print(il)
        else:
            print(line)
    if result_file and os.path.exists(result_file):
        with open(result_file, "r", encoding="utf-8") as rf:
            data = json.load(rf)
        with open("data/client/config/enhance_values.json", "w", encoding="utf-8") as fout:
            json.dump(data, fout, ensure_ascii=False, indent=2)
        print("★ 已写入 enhance_values.json, 强化项数=%d" % len(data))
        # 样例
        for eid in ["405010101","405010105","405010108"]:
            if eid in data:
                print("  %s:" % eid)
                for lv in ["1","2","5"]:
                    if lv in data[eid]:
                        print("    lv%s: %s" % (lv, data[eid][lv]))
    else:
        print("未找到结果文件")
except Exception as e:
    print("err:",e)
    for r in res: print(r[:600])
