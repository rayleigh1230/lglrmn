"""dump完整BATTLE_COMMAND_DICT + battle_action动作定义 + damage_list结构"""
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
        "    # 1. 完整 BATTLE_COMMAND_DICT",
        "    import scene_zoom0.battle_command.battle_command_factory as bcf",
        "    d=bcf.BATTLE_COMMAND_DICT",
        "    out.append('=== BATTLE_COMMAND_DICT (命令ID->类型) ===')",
        "    for k,v in sorted(d.items()):",
        "        cls=v[0] if isinstance(v,tuple) else v",
        "        flag=v[1] if isinstance(v,tuple) else '?'",
        "        out.append('  cmd_id='+str(k)+': '+cls.__name__+' flag='+str(flag))",
        "    # 2. battle_action 模块(动作ID定义)",
        "    try:",
        "        import common.config.battle_action as ba",
        "        attrs=[a for a in dir(ba) if not a.startswith('_')]",
        "        out.append('=== battle_action attrs ===')",
        "        # 找ID常量(数字)",
        "        id_consts=[(a,getattr(ba,a)) for a in attrs if isinstance(getattr(ba,a,None),(int,))]",
        "        for name,val in id_consts[:30]:",
        "            out.append('  '+name+'='+str(val))",
        "    except Exception as e: out.append('battle_action err='+str(e)[:80])",
        "    # 3. BattleDamageType 完整枚举",
        "    try:",
        "        from common.common_definition import BattleDamageType",
        "        out.append('=== BattleDamageType ===')",
        "        for a in dir(BattleDamageType):",
        "            if not a.startswith('_'):",
        "                try:",
        "                    v=getattr(BattleDamageType,a)",
        "                    out.append('  '+a+'='+repr(v))",
        "                except: pass",
        "    except Exception as e: out.append('bdt err='+str(e)[:60])",
        "    # 4. BattleLogger (战报日志机制)",
        "    try:",
        "        import scene_zoom0.battle_logger as bl",
        "        attrs=[a for a in dir(bl) if not a.startswith('__')]",
        "        out.append('=== battle_logger ===')",
        "        out.append('attrs='+str(attrs[:25]))",
        "        # 看有没有BattleLogger类",
        "        if hasattr(bl,'BattleLogger'):",
        "            BL=bl.BattleLogger",
        "            for k,v in vars(BL).items():",
        "                if not k.startswith('__'):",
        "                    out.append('  BattleLogger.'+k+' = '+repr(v)[:60])",
        "    except Exception as e: out.append('logger err='+str(e)[:80])",
        "    # 5. WeaponAttackCommand 实例的damage_list结构(如果能找到运行时实例)",
        "    # 看preprocess_data怎么处理damage_list",
        "    try:",
        "        import scene_zoom0.battle_command.weapon_attack_command as wac",
        "        if hasattr(wac,'WeaponAttackCommand'):",
        "            WAC=wac.WeaponAttackCommand",
        "            # preprocess_data方法",
        "            if hasattr(WAC,'preprocess_data'):",
        "                co=WAC.preprocess_data.__code__",
        "                out.append('preprocess_data args='+str(list(co.co_varnames[:co.co_argcount])))",
        "                out.append('preprocess_data names='+str(list(co.co_names)))",
        "                out.append('preprocess_data consts='+repr([c for c in co.co_consts if not hasattr(c,'co_code')][:15]))",
        "    except Exception as e: out.append('wac err='+str(e)[:80])",
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
for _ in range(40):
    if done[0]:break
    time.sleep(0.4)
try:
    for line in json.loads(res[0]):print("  "+line)
except:
    for r in res:print(r)
