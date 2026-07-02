"""探测缺失的科技/模块表是否能访问，确认模块路径和记录数（不dump全量，先探路）"""
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
        "import sys, traceback, json",
        "out=[]",
        "try:",
        "    tables = [",
        "        'common.config.db.Tb_cfg_weapon_tech',",
        "        'common.config.db.Tb_cfg_weapon_tech_pack',",
        "        'common.config.db.Tb_cfg_weapon_tech_class',",
        "        'common.config.db.Tb_cfg_weapon_tech_recycle',",
        "        'common.config.db.Tb_cfg_module',",
        "        'common.config.db.Tb_cfg_module_blueprint',",
        "        'common.config.db.Tb_cfg_tech_blueprint',",
        "        'common.config.db.Tb_cfg_tech_bp_skill',",
        "        'common.config.db.Tb_cfg_tech_bp_skill_level',",
        "        'common.config.db.Tb_cfg_tech_store',",
        "    ]",
        "    for modname in tables:",
        "        try:",
        "            mod=__import__(modname, fromlist=['x'])",
        "            # 尝试多种数据访问方式",
        "            data=None",
        "            for method in ['get_all_data','get_data','data','all_data']:",
        "                if hasattr(mod, method):",
        "                    try:",
        "                        data=getattr(mod, method)()",
        "                        break",
        "                    except Exception:",
        "                        pass",
        "            if data is None:",
        "                # 看看模块有哪些属性",
        "                attrs=[a for a in dir(mod) if not a.startswith('_')][:20]",
        "                out.append(modname+': NO data method. attrs='+str(attrs))",
        "                continue",
        "            cnt=len(data) if hasattr(data,'__len__') else 'unknown'",
        "            # 取第一条记录看结构",
        "            sample=None",
        "            try:",
        "                items=list(data.items())[:1]",
        "                if items:",
        "                    k,v=items[0]",
        "                    if hasattr(v,'keys'):",
        "                        sample={'key':str(k),'fields':list(v.keys())[:15]}",
        "                    elif isinstance(v,(list,tuple)):",
        "                        sample={'key':str(k),'list_len':len(v),'sample':list(v)[:8]}",
        "                    else:",
        "                        sample={'key':str(k),'type':str(type(v))}",
        "            except Exception as e:",
        "                sample='sample err '+str(e)[:60]",
        "            out.append(modname+': OK count='+str(cnt)+' sample='+json.dumps(sample,default=str)[:300])",
        "        except Exception as e:",
        "            out.append(modname+': IMPORT_ERR='+str(e)[:100])",
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
