"""深入 dump replace_text_param + parse_param，理解占位符解析。
同时找节点描述的实际渲染入口(可能在 set_attr_data / set_ui_data)。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc, types, sys as _sys, inspect
out = []
try:
    gc.collect()

    # 1. replace_text_param + parse_param 完整代码对象
    import common.npc_event_utils as neu
    for fname in ["replace_text_param", "parse_param", "get_desc_text", "format_desc", "replace_desc_param"]:
        fn = getattr(neu, fname, None)
        if fn and hasattr(fn, "__code__"):
            co = fn.__code__
            out.append("=== %s ===" % fname)
            out.append("  args=%s" % list(co.co_varnames[:co.co_argcount]))
            out.append("  co_names=%s" % list(co.co_names))
            out.append("  co_consts=%s" % [str(c)[:90] for c in co.co_consts])

    # 2. 调用 replace_text_param 试试: 用已知的含占位符 DESC
    # 快速输出 prefix=9205(快速输出) DESC="每{P}秒时，缩短系统主武器{101}%..."
    # 但先看 parse_param 怎么取值——可能要从某个 effect 实例取
    out.append("")
    out.append("=== 尝试找 EFFECT_PARAM 解析 ===")
    # 找 parse_param 的源码逻辑(通过 co_names 反推)
    pp = getattr(neu, "parse_param", None)
    if pp:
        co = pp.__code__
        out.append("parse_param co_varnames=%s" % list(co.co_varnames))
        out.append("parse_param co_names=%s" % list(co.co_names))
        out.append("parse_param co_consts=%s" % [str(c)[:90] for c in co.co_consts])

    # 3. 找节点描述渲染入口: SystemEnhanceTreeEhanceNode 的 set_attr_data/set_ui_data
    nodes = [o for o in gc.get_objects() if type(o).__name__ == "SystemEnhanceTreeEhanceNode"]
    if nodes:
        cls = type(nodes[0])
        out.append("")
        out.append("=== SystemEnhanceTreeEhanceNode 方法(set_attr_data等) ===")
        for name in ["set_attr_data", "set_ui_data", "set_desc", "update_desc", "refresh_desc", "set_text"]:
            m = getattr(cls, name, None)
            if m and hasattr(m, "__code__") or (hasattr(m,"__func__") and hasattr(m.__func__,"__code__")):
                fn = getattr(m, "__func__", m)
                co = fn.__code__
                out.append("--- %s ---" % name)
                out.append("  co_names=%s" % list(co.co_names)[:18])
                out.append("  co_consts=%s" % [str(c)[:70] for c in co.co_consts][:10])

    # 4. 直接抓节点的 text_type_1.getString() —— 用 unwrap
    if nodes:
        n = nodes[1]  # 405010101
        eid = getattr(n, "enhance_id", "?")
        out.append("")
        out.append("=== 节点 %s text_type 取值 ===" % eid)
        t1 = getattr(n, "text_type_1", None)
        if t1:
            # NodeBase 包装, 试多种方法取文本
            for meth in ["getString", "getTitle", "getText", "get_string"]:
                try:
                    v = getattr(t1, meth, None)
                    if callable(v):
                        s = v()
                        if s: out.append("  %s()=%s" % (meth, s)); break
                except Exception as e: out.append("  %s err=%s" % (meth, str(e)[:50]))
            # 试 inst 属性
            try:
                inst = getattr(t1, "inst", None)
                if inst:
                    s = inst.getString() if hasattr(inst,"getString") else None
                    if s: out.append("  inst.getString()=%s" % s)
            except Exception as e: out.append("  inst err=%s" % str(e)[:50])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_desc_parse_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_desc_parse_mod', tmpf)",
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
