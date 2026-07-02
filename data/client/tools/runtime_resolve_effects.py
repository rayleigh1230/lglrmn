"""运行时直接探测：调用游戏的属性计算函数，拿到各强化在各级的真实数值
避免猜表名——直接用游戏自己的解析逻辑算出结果
"""
import frida, time, json, os

OUTDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config").replace("\\", "/")
OUTDIR_PY = json.dumps(OUTDIR)

JS = r"""
var OUTDIR_JS = """ + OUTDIR_PY + r""";
var log=[];
try {
    var py = Process.getModuleByName("python311.dll");
    var f = function(n){ return py.getExportByName(n); };
    var Ens=new NativeFunction(f("PyGILState_Ensure"),'pointer',[]);
    var Rel=new NativeFunction(f("PyGILState_Release"),'void',['pointer']);
    var Run=new NativeFunction(f("PyRun_SimpleString"),'int',['pointer']);
    var AddM=new NativeFunction(f("PyImport_AddModule"),'pointer',['pointer']);
    var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer']);
    var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
    var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);
    var pyCode = [
        "import sys, traceback, json, os",
        "out=[]",
        "try:",
        "    # 思路: 找到游戏里负责'系统强化效果'的模块, 直接调用它的解析函数",
        "    # 从 ship_attribute 模块入口找",
        "    import common.config.db as db",
        "    # 列出所有含 enhance/level/skill 的表",
        "    candidates=[n for n in dir(db) if any(k in n.lower() for k in ['enhance','adjust','level_value','effect_lv','skill_level','intensify','adjust_value'])]",
        "    out.append('候选表: '+str(candidates))",
        "    # 重点: Tb_cfg_system_enhance 的记录是否有 level 相关字段",
        "    enh_mod=__import__('common.config.db.Tb_cfg_system_enhance', fromlist=['x'])",
        "    enh_data=enh_mod.get_all_data()",
        "    # 看斗牛射击辅助 405010105 的完整记录(含所有隐藏字段)",
        "    rec=enh_data.get(405010105)",
        "    if rec is not None:",
        "        out.append('405010105 type='+str(type(rec)))",
        "        if hasattr(rec,'keys'):",
        "            out.append('405010105 keys='+str(list(rec.keys())))",
        "            for k in rec.keys():",
        "                out.append('  '+str(k)+'='+str(rec[k])[:100])",
        "        else:",
        "            out.append('405010105 repr='+repr(rec)[:300])",
        "    # 看 system_effect 20301 的完整记录(含隐藏字段)",
        "    se_mod=__import__('common.config.db.Tb_cfg_system_effect', fromlist=['x'])",
        "    se_data=se_mod.get_all_data()",
        "    rec203=se_data.get(20301)",
        "    if rec203 is not None:",
        "        out.append('20301 keys='+str(list(rec203.keys()) if hasattr(rec203,'keys') else 'no keys'))",
        "        if hasattr(rec203,'keys'):",
        "            for k in rec203.keys():",
        "                out.append('  20301.'+str(k)+'='+str(rec203[k])[:100])",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_PROBE_OUT=json.dumps(out)"
    ].join("\n");
    var code=Memory.allocUtf8String(pyCode);
    var gil=Ens(); var rc=Run(code);
    log.push("rc="+rc);
    if(rc==0){
        var mod=AddM(Memory.allocUtf8String("__main__"));
        var v=GetA(mod, Memory.allocUtf8String("_PROBE_OUT"));
        if(!v.isNull()){var st=Str(v);var cs=UTF8(st);if(!cs.isNull())log.push("RESULT="+cs.readUtf8String());}
    }
    Rel(gil);
} catch(e){log.push("JSERR="+e);}
send(JSON.stringify(log));
"""
done=[False];res=[]
def on_msg(m,d):
    if m["type"]=="send":res.append(m["payload"]);done[0]=True
    elif m["type"]=="error":res.append("ERR:"+m.get("description",""));done[0]=True
pid=[p.pid for p in frida.get_local_device().enumerate_processes() if p.name=="infinite_lagrange_cn.exe"]
if not pid:print("NO_GAME");exit()
print("attach",pid[0])
s=frida.attach(pid[0]).create_script(JS);s.on('message',on_msg);s.load()
for _ in range(120):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
