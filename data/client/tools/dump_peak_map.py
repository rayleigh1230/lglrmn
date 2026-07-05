"""dump SYSTEM_PEAK_ENHANCE_DATA 完整映射(slotId→peakEnhanceId) + 验证机制。"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    import common.blueprint_utils as bu

    # 1. SYSTEM_PEAK_ENHANCE_DATA 完整dump
    sped = getattr(bu, "SYSTEM_PEAK_ENHANCE_DATA", None)
    if sped:
        # 转 dict
        result = {}
        for k, v in sped.items():
            result[str(k)] = [str(x) for x in v]
        out.append("SYSTEM_PEAK_ENHANCE_DATA 条数=%d" % len(result))
        out.append("RESULT_JSON=" + json.dumps(result, ensure_ascii=False))

    # 2. 调 get_enhancement_peak_extra_max_level 验证
    fn = getattr(bu, "get_enhancement_peak_extra_max_level", None)
    if fn:
        out.append("")
        out.append("=== get_enhancement_peak_extra_max_level 实测 ===")
        # 试几个 enhance_id + 不同 peak_level
        for eid in [102010101, 107010101, 603010101]:
            for pk in [0, 5, 10, 16, 20]:
                try:
                    r = fn(eid, pk)
                    out.append("  eid=%s peak=%s → extra_max=%s" % (eid, pk, r))
                except Exception as e:
                    out.append("  eid=%s peak=%s err=%s" % (eid, pk, str(e)[:50]))

    # 3. get_peak_ex_enhance_id (从普通enhance_id找对应的peak enhance)
    fn2 = getattr(bu, "get_peak_ex_enhance_id", None)
    if fn2 and hasattr(fn2, "__code__"):
        out.append("")
        out.append("=== get_peak_ex_enhance_id ===")
        out.append("  args=%s" % list(fn2.__code__.co_varnames[:fn2.__code__.co_argcount]))
        out.append("  co_names=%s" % list(fn2.__code__.co_names))
        for eid in [102010101, 107010101]:
            try:
                r = fn2(eid)
                out.append("  %s → %s" % (eid, r))
            except Exception as e:
                out.append("  %s err=%s" % (eid, str(e)[:50]))

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_peak_map_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_peak_map_mod', tmpf)",
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
        if isinstance(line, str) and line.startswith("RESULT="):
            inner = json.loads(line[7:])
            for il in inner:
                if isinstance(il, str) and il.startswith("RESULT_JSON="):
                    data = json.loads(il[len("RESULT_JSON="):])
                    with open("data/client/config/peak_enhance_map.json", "w", encoding="utf-8") as fout:
                        json.dump(data, fout, ensure_ascii=False, indent=2)
                    print("★ peak_enhance_map.json 写入, 条数=%d" % len(data))
                    for k in list(data.keys())[:5]:
                        print("  %s: %s" % (k, data[k]))
                else:
                    print(il)
        else:
            print(line)
except Exception as e:
    print("err:",e)
    for r in res: print(r[:600])
