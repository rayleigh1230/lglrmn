"""全量 dump 强化项描述: 读 cfg_system_enhance.json(离线全量),
对每个强化项每个等级调用运行时 get_effect_desc(prefix, maxlv, lv)。
输出 enhanceId+level → 渲染文本 映射表(全船)。

不依赖具体船打开, 只用 prefix+maxlv+lv 三个参数。
"""
import frida, time, json, sys

# 先读离线 json 拿全量 enhance 列表
enh_cfg = json.load(open("data/client/config/cfg_system_enhance.json", encoding="utf-8"))
# 收集所有需要渲染的 (eid, prefix, maxlv)
tasks = []
for eid_str, rec in enh_cfg.items():
    if len(eid_str) != 9:
        continue
    optidx = int(eid_str[7:9])
    if optidx < 1 or optidx > 18:
        continue  # 只普通强化
    prefix = rec.get("SYSTEM_EFFECT_PREFIX")
    cost = rec.get("ENHANCE_COST")
    if not prefix or not cost or cost == [0]:
        continue
    tasks.append((eid_str, prefix, len(cost)))

print("待渲染强化项数:", len(tasks))

# 把 tasks 传进 frida, 批量调用 get_effect_desc
# 把 tasks 写到临时文件, frida 端读
import os, tempfile
tasks_file = os.path.join(tempfile.gettempdir(), "_enh_desc_tasks.json")
with open(tasks_file, "w", encoding="utf-8") as tf:
    json.dump(tasks, tf, ensure_ascii=False)
print("tasks 写入:", tasks_file, "项数:", len(tasks))

PROBE_CODE = '''
import json, traceback, gc, re, os, tempfile
out = []
try:
    gc.collect()
    import ui.ship_blueprint.bp_ui_utils as bpu
    desc_fn = getattr(bpu, "get_effect_desc", None)
    if not desc_fn:
        out.append("缺get_effect_desc")
    else:
        def clean(s):
            s = re.sub(r"#c[0-9a-fA-F]{6}", "", str(s))
            s = s.replace("#l","").replace("#n","").replace("#e","")
            return s.strip()

        tasks_file = os.path.join(tempfile.gettempdir(), "_enh_desc_tasks.json")
        with open(tasks_file, "r", encoding="utf-8") as tf:
            tasks = json.load(tf)
        result = {}
        err_cnt = 0
        for i, (eid_str, prefix, maxlv) in enumerate(tasks):
            lv_desc = {}
            for lv in range(1, maxlv + 1):
                try:
                    rendered = desc_fn(prefix, maxlv, lv)
                    lv_desc[str(lv)] = clean(rendered)
                except Exception as e:
                    lv_desc[str(lv)] = ""
                    err_cnt += 1
            result[eid_str] = lv_desc
        out.append("完成=%d 项, err=%d" % (len(result), err_cnt))
        # 结果也写文件(避免 IPC 传输过大)
        out_file = os.path.join(tempfile.gettempdir(), "_enh_desc_result.json")
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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_full_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_full_mod', tmpf)",
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
# 全量可能慢, 给足超时
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
    # 从结果文件读
    if result_file and os.path.exists(result_file):
        with open(result_file, "r", encoding="utf-8") as rf:
            data = json.load(rf)
        with open("data/client/config/enhance_desc_rendered.json", "w", encoding="utf-8") as fout:
            json.dump(data, fout, ensure_ascii=False, indent=2)
        print("★ 已写入 enhance_desc_rendered.json, 强化项数=%d" % len(data))
        for eid in list(data.keys())[:3]:
            print("  %s:" % eid)
            for lv, d in list(data[eid].items())[:3]:
                print("    lv%s: %s" % (lv, d))
    else:
        print("未找到结果文件")
except Exception as e:
    print("err:",e)
    for r in res: print(r[:800])
