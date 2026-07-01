"""列出所有战报详情+摘要,找10斗牛对开阳"""
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
        "    from data_manager.game_data_mgr import GameDataMgr",
        "    from common.common_definition import TableID",
        "    inst=GameDataMgr()",
        "    rpt=inst.get_table(TableID.REPORT)",
        "    rd=inst.get_table(TableID.REPORT_DETAIL)",
        "    out.append('REPORT: '+str(len(rpt))+', REPORT_DETAIL: '+str(len(rd)))",
        "    for i,(bid,detail) in enumerate(rd.items()):",
        "        info=''",
        "        if bid in rpt:",
        "            r=rpt[bid]",
        "            bg=r.get('begin_time',0) if hasattr(r,'get') else getattr(r,'begin_time',0)",
        "            ed=r.get('end_time',0) if hasattr(r,'get') else getattr(r,'end_time',0)",
        "            nm=r.get('name','') if hasattr(r,'get') else getattr(r,'name','')",
        "            ec=r.get('enemy_team_name','') if hasattr(r,'get') else getattr(r,'enemy_team_name','')",
        "            cost=r.get('cost',0) if hasattr(r,'get') else getattr(r,'cost',0)",
        "            info=' dur='+str(ed-bg)+'s cost='+str(cost)+' name='+str(nm)[:25]+' enemy='+str(ec)[:25]",
        "        out.append('['+str(i)+'] '+str(bid)+info)",
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
for _ in range(45):
    if done[0]:break
    time.sleep(0.4)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
