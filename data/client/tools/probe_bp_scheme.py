"""探测超主力舰蓝图系统方案表 + 战报techId的真实归属，确认最后一跳映射"""
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
    var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
    var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);
    var pyCode = [
        "import sys, traceback, json, os",
        "out=[]",
        "try:",
        "    OUTDIR=" + JSON.stringify(OUTDIR_JS),
        "    os.makedirs(OUTDIR, exist_ok=True)",
        "    def _ser(v):",
        "        if hasattr(v,'keys') and hasattr(v,'__getitem__'):",
        "            try: return {str(k):_ser(vv) for k,vv in v.items()}",
        "            except: return str(v)",
        "        if isinstance(v,(list,tuple)): return [_ser(x) for x in v]",
        "        if isinstance(v,(int,float,str,bool)) or v is None: return v",
        "        return str(v)",
        "    def dump_table(modname, fname):",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            data=None",
        "            for method in ['get_all_data','get_data']:",
        "                if hasattr(mod, method):",
        "                    try: data=getattr(mod, method)(); break",
        "                    except Exception: pass",
        "            if data is None: out.append(modname+': NO data'); return 0",
        "            records={}",
        "            for k,v in list(data.items()):",
        "                records[str(k)]=_ser(v)",
        "            path=os.path.join(OUTDIR, fname)",
        "            with open(path,'w',encoding='utf-8') as f2:",
        "                json.dump(records, f2, ensure_ascii=False, default=str)",
        "            out.append(fname+': '+str(len(records))+' records')",
        "            return len(records)",
        "        except Exception as e:",
        "            out.append(modname+' ERR='+str(e)[:120]); return 0",
        "    # 超主力舰蓝图系统方案(航母/战列走这个)",
        "    dump_table('common.config.db.Tb_super_main_ship_bp_system_scheme', 'cfg_super_main_bp_scheme.json')",
        "    # 蓝图方案(普通舰船装配方案)",
        "    dump_table('common.config.db.Tb_cfg_blueprint_scheme', 'cfg_blueprint_scheme.json')",
        "    # 武器科技到效果的直接映射(可能是这个)",
        "    dump_table('common.config.db.Tb_cfg_weapon_tech_to_effect', 'cfg_weapon_tech_to_effect.json')",
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
print("attach",pid[0],"-> OUTDIR=",OUTDIR)
s=frida.attach(pid[0]).create_script(JS);s.on('message',on_msg);s.load()
for _ in range(120):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
