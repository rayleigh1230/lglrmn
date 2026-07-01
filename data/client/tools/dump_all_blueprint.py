"""dump蓝图相关配置表完整数据: Tb_cfg_ship_blueprint + module_effect + system_effect + weapon_action"""
import frida, time, json

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
    var pyCode = [
        "import sys, traceback, json, os",
        "out=[]",
        "try:",
        "    OUTDIR=r'D:\\\\无尽的拉格朗日\\\\dumped'",
        "    os.makedirs(OUTDIR, exist_ok=True)",
        "    def dump_table(modname, fname, max_recs=None):",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            data=mod.get_all_data()",
        "            if data is None:",
        "                out.append(modname+': get_all_data=None'); return 0",
        "            cnt=len(data) if hasattr(data,'__len__') else 0",
        "            # 序列化: taggeddict的记录可能是tuple或dict",
        "            records={}",
        "            items=list(data.items())[:max_recs] if max_recs else list(data.items())",
        "            for k,v in items:",
        "                try:",
        "                    if hasattr(v,'keys'):",
        "                        records[str(k)]={kk:vv for kk,vv in v.items()}",
        "                    elif isinstance(v,(list,tuple)):",
        "                        records[str(k)]=list(v)",
        "                    else:",
        "                        records[str(k)]=str(v)",
        "                except Exception:",
        "                    records[str(k)]=repr(v)[:100]",
        "            path=os.path.join(OUTDIR, fname)",
        "            with open(path,'w',encoding='utf-8') as f2:",
        "                json.dump(records, f2, ensure_ascii=False, indent=2, default=str)",
        "            out.append(fname+': '+str(cnt)+' records saved ('+str(len(records))+' dumped)')",
        "            return cnt",
        "        except Exception as e:",
        "            out.append(modname+' err='+str(e)[:80]); return 0",
        "    # 1. 蓝图主表",
        "    dump_table('common.config.db.Tb_cfg_ship_blueprint', 'cfg_ship_blueprint.json')",
        "    # 2. 蓝图概览",
        "    dump_table('common.config.db.Tb_cfg_ship_bp_overview', 'cfg_ship_bp_overview.json')",
        "    # 3. 蓝图等级",
        "    dump_table('common.config.db.Tb_cfg_ship_blueprint_lv', 'cfg_ship_blueprint_lv.json')",
        "    # 4. 模块效果(武器/模块数值)",
        "    dump_table('common.config.db.Tb_cfg_module_effect', 'cfg_module_effect.json')",
        "    # 5. 系统效果",
        "    dump_table('common.config.db.Tb_cfg_system_effect', 'cfg_system_effect.json')",
        "    # 6. 武器动作(攻击参数)",
        "    dump_table('common.config.db.Tb_cfg_weapon_action', 'cfg_weapon_action.json')",
        "    # 7. 武器配置(主表)",
        "    dump_table('common.config.db.Tb_cfg_weapon', 'cfg_weapon.json')",
        "    # 8. 舰船主表",
        "    dump_table('common.config.db.Tb_cfg_ship', 'cfg_ship.json')",
        "    # 9. 蓝图科技",
        "    dump_table('common.config.db.Tb_cfg_blueprint_technical', 'cfg_blueprint_technical.json')",
        "    # 10. 舰船槽位",
        "    dump_table('common.config.db.Tb_cfg_ship_slot', 'cfg_ship_slot.json')",
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
for _ in range(60):
    if done[0]:break
    time.sleep(0.5)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
