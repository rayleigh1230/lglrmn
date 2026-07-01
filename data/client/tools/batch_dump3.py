"""v3: JS极简化 - 只用一行Python读文件exec, 路径用变量避免转义"""
import frida, time, json

# dump_logic文件已存在(_dump_logic.py), 末尾有_PROBE_OUT保障
# JS只做: 把文件路径作为普通字符串传给一个最简单的Python执行器

# 用send机制传路径更安全, 但最简方案: 路径里只有中文和盘符, allocUtf8String能处理
JS = r"""
var log=[];
try {
    var py = Process.getModuleByName("python311.dll");
    var f = function(n){ return py.getExportByName(n); };
    var Ens=new NativeFunction(f("PyGILState_Ensure"),'pointer',[]);
    var Rel=new NativeFunction(f("PyGILState_Release"),'void',['pointer']);
    var Run=new NativeFunction(f("PyRun_SimpleString"),'int',['pointer']);
    var AddM=new NativeFunction(f("PyImport_AddModule"),'pointer',['pointer']);
    var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
    var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);

    // 极简: 用compile+exec模式, 路径用原生Python字符串
    // 注意: JS字符串里 \n 要写 \\n 才能让Python看到换行
    var pyCode = [
        "import traceback",
        "_f = r'D:\\无尽的拉格朗日\\_dump_logic.py'",
        "try:",
        "    with open(_f, encoding='utf-8') as _fh: _src = _fh.read()",
        "    exec(compile(_src, _f, 'exec'), globals())",
        "except Exception:",
        "    _PROBE_OUT = 'ERR:' + traceback.format_exc()[-500:]"
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil=Ens();
    var rc=Run(code);
    log.push("rc="+rc);
    if(rc==0){
        var mod=AddM(Memory.allocUtf8String("__main__"));
        var v=GetA(mod, Memory.allocUtf8String("_PROBE_OUT"));
        if(!v.isNull()){
            var st=Str(v); var cs=UTF8(st);
            if(!cs.isNull()) log.push("RESULT="+cs.readUtf8String());
        } else { log.push("_PROBE_OUT null"); }
    }
    Rel(gil);
} catch(e){ log.push("JSERR="+e); }
send(JSON.stringify(log));
"""

done=[False]; res=[]
def on_msg(m,d):
    if m["type"]=="send": res.append(m["payload"]); done[0]=True
    elif m["type"]=="error": res.append("ERR:"+m.get("description","")+"|"+m.get("stack","")); done[0]=True

pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach",pid[0],"...")
s=frida.attach(pid[0]).create_script(JS)
s.on('message',on_msg); s.load()
for _ in range(60):
    if done[0]: break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]): print("  "+line)
except:
    for r in res: print(r)
