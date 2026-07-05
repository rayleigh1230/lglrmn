"""frida 抓武器详情面板的 UI 文本，找伤害类型(能量/实弹)的来源。
用户打开了大帝M2武器面板，显示"能量伤害"。
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, gc
out = []
try:
    gc.collect()
    # 找所有 ccui.Text 实例，含"伤害"/"能量"/"实弹"的文本
    texts = []
    for o in gc.get_objects():
        try:
            tn = type(o).__name__
            if tn in ("Text", "ccui.Text", "Label"):
                s = None
                try: s = o.getString()
                except:
                    try: s = o.getStringValue()
                    except: pass
                if s and any(k in str(s) for k in ["伤害","能量","实弹","弹道","投射","直射","武器","离子","脉冲","鱼雷","导弹","火炮"]):
                    texts.append(str(s)[:80])
            elif hasattr(o, "getString") and callable(o.getString):
                try:
                    s = o.getString()
                    if s and any(k in str(s) for k in ["伤害类型","能量伤害","实弹伤害","弹道类型"]):
                        texts.append("[NodeBase] " + str(s)[:80])
                except: pass
        except: pass

    out.append("=== 含伤害/能量/弹道的UI文本 ===")
    for t in sorted(set(texts))[:30]:
        out.append("  " + t)

    # 也找武器详情面板类
    out.append("")
    out.append("=== 武器详情面板类 ===")
    for o in gc.get_objects():
        if isinstance(o, type):
            cn = o.__name__
            if any(k in cn for k in ["WeaponInfo","WeaponDetail","WeaponTip","WeaponPanel","WeaponAttr","ShipWeaponInfo"]):
                out.append("  " + cn)

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_wpanel_mod.py')",
    "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_wpanel_mod', tmpf)",
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
