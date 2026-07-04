"""追踪战斗数据传输管道：从'发起战斗'入口找到网络发送层。

策略：
1. 找舰队行动/战斗发起相关的模块和函数
2. 找网络协议定义（proto/协议号）
3. 追踪数据序列化路径
"""
import frida, time, json, sys

PROBE_CODE = '''
import json, traceback, sys
out = []
try:
    from data.battle.client_battle_data import ShipField, ClientBattleShipField

    # 完整字段列表和 RECORD_TEMPLATE
    out.append("ShipField.FIELDS = " + json.dumps(list(ShipField.FIELDS)))
    out.append("ClientBattleShipField.FIELDS = " + json.dumps(list(ClientBattleShipField.FIELDS)))

    rt = getattr(ShipField, "RECORD_TEMPLATE", None)
    if rt:
        out.append("ShipField.RECORD_TEMPLATE keys = " + json.dumps(list(rt.keys())))

    # 看 ShipField 里和块0对应的字段名
    # 块0: [userid, ship_id, ?, ?, ?, ?, [array], modules, tech_str, scheme_id, scheme_ref, ?, enabled_slots, ?, ?]
    # 映射 ShipField 的字段名
    relevant = {}
    for attr in dir(ShipField):
        if attr.isupper() and not attr.startswith("_") and attr not in ("FIELDS", "TABLE_NAME", "PRIMARY_KEY", "USER_ID_KEY", "RECORD_TEMPLATE"):
            val = getattr(ShipField, attr)
            if isinstance(val, str):
                relevant[attr] = val
    out.append("ShipField field names (%d):" % len(relevant))
    for k in sorted(relevant.keys()):
        out.append("  %s = %s" % (k, relevant[k]))

except Exception:
    out.append("ERR=" + traceback.format_exc()[:1500])

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
    "tmpf = os.path.join(tempfile.gettempdir(), '_battle_pipe_probe.py')",
    "with open(tmpf, 'w') as f: f.write(code)",
    "spec = importlib.util.spec_from_file_location('_battle_pipe_probe', tmpf)",
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
            for d in json.loads(line[7:]): print("  "+str(d))
        else: print("  "+line)
except Exception as e:
    print("err:",e)
    for r in res: print(r)
