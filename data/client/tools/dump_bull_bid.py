"""按battle_id精确dump指定战报(190241382543560, 51秒)"""
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
        "import sys, traceback, json, base64, zlib, os",
        "out=[]",
        "try:",
        "    from data_manager.game_data_mgr import GameDataMgr",
        "    from common.common_definition import TableID",
        "    inst=GameDataMgr()",
        "    rpt=inst.get_table(TableID.REPORT)",
        "    rd=inst.get_table(TableID.REPORT_DETAIL)",
        "    BID=190241382564537",
        "    OUTDIR=r'E:\\\\战斗模拟器\\\\data\\\\client\\\\battle_report_today2'",
        "    os.makedirs(OUTDIR, exist_ok=True)",
        "    out.append('target battle_id='+str(BID))",
        "    if BID in rpt:",
        "        r=rpt[BID]",
        "        summary={}",
        "        if hasattr(r,'keys'):",
        "            for k in r.keys(): summary[str(k)]=r[k]",
        "        with open(os.path.join(OUTDIR,'report_summary.json'),'w',encoding='utf-8') as f2:",
        "            json.dump(summary, f2, ensure_ascii=False, indent=2, default=str)",
        "        bg=summary.get('begin_time',0); ed=summary.get('end_time',0)",
        "        nm=summary.get('name',''); enm=summary.get('enemy_team_name','')",
        "        out.append('begin='+str(bg)+' end='+str(ed)+' dur='+str(ed-bg))",
        "        out.append('name='+str(nm)[:40])",
        "        out.append('enemy='+str(enm)[:40])",
        "        out.append('cost='+str(summary.get('cost',0)))",
        "    if BID in rd:",
        "        detail=rd[BID]",
        "        for field in ['team_battle_data','enemy_battle_data','loss_ship_info']:",
        "            raw=getattr(detail,field,None)",
        "            if raw is None and hasattr(detail,'keys'): raw=detail.get(field,'')",
        "            if not raw:",
        "                out.append(field+': empty'); continue",
        "            with open(os.path.join(OUTDIR,field+'.txt'),'w') as f2: f2.write(raw)",
        "            try:",
        "                dec=base64.b64decode(raw)",
        "                decomp=zlib.decompress(dec[4:]).decode('utf-8','ignore')",
        "                with open(os.path.join(OUTDIR,field+'_decoded.txt'),'w',encoding='utf-8') as f2: f2.write(decomp)",
        "                out.append(field+': '+str(len(raw))+'chars -> '+str(len(decomp))+'B')",
        "            except: out.append(field+' decode skip')",
        "    else:",
        "        out.append('BID not in REPORT_DETAIL!')",
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
for _ in range(50):
    if done[0]:break
    time.sleep(0.4)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
