"""提取舰种图标(icon_ship_type_*) + 探测舰船2D卡片图命名规则"""
import frida, time, json, os

OUT_DIR = r"E:\战斗模拟器\data\client\icons"
OUT_DIR_FORWARD = OUT_DIR.replace("\\", "/")

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
        "import traceback,json,os",
        "out=[]",
        "OUT_DIR='__OUT_DIR_FORWARD__'",
        "try:",
        "    import nxio3",
        "    from common import icon_utils",
        "    ur=icon_utils.ui_res",
        "    saved=0; missing=0",
        "    for c in sorted([a for a in dir(ur) if a.startswith('SHIP_TYPE_')]):",
        "        path=getattr(ur,c,None)",
        "        if not path or not isinstance(path,str): continue",
        "        full='res:/'+path.lstrip('/')",
        "        try:",
        "            if not nxio3.exists(full): missing+=1; continue",
        "            data=nxio3.load_file(full)",
        "            if not data: missing+=1; continue",
        "            fn=os.path.basename(path)",
        "            with open(os.path.join(OUT_DIR,fn),'wb') as wf: wf.write(data)",
        "            saved+=1",
        "        except Exception as e: out.append(c+' ERR='+str(e)[:50])",
        "    out.append('shiptype_icon saved='+str(saved)+' missing='+str(missing))",
        "    # 探测舰船卡片图命名",
        "    base='cocosui/_resource/ship_blueprint/'",
        "    from data_manager.game_data_mgr import GameDataMgr",
        "    from common.common_definition import TableID",
        "    inst=GameDataMgr()",
        "    ship_tbl=inst.get_table(TableID.SHIP)",
        "    if ship_tbl:",
        "        k0=next(iter(ship_tbl.keys()))",
        "        out.append('ship_sample_key='+str(k0))",
        "        for pat in [str(k0)+'.png', str(k0)+'_card.png', 'ship_'+str(k0)+'.png', str(k0)+'_big.png']:",
        "            full='res:/'+base+pat",
        "            out.append('  '+pat+' exists='+str(nxio3.exists(full)))",
        "except Exception:",
        "    out.append('ERR='+traceback.format_exc()[:500])",
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
JS = JS.replace("__OUT_DIR_FORWARD__", OUT_DIR_FORWARD)
s=frida.attach(pid[0]).create_script(JS);s.on('message',on_msg);s.load()
for _ in range(100):
    if done[0]:break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):print("  "+line[:200])
