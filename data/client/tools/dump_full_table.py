"""完整导出客户端配置表——用 get_all_data() + get_origin_dict() 把每行所有字段导出。

不再逐字段补丁，直接从游戏内存完整导出，"把水填满"。

用法：
  python dump_full_table.py <table_name>
  table_name = system_effect / weapon / module / ship_slot / weapon_action / ship / ...

原理：
  游戏的 Tb_cfg_xxx 是 module，有 .get_all_data() 返回全表 {key: CfgRecordWrap}。
  每行 CfgRecordWrap 有 .get_origin_dict() 返回完整字段 dict。
  导出 {key: {field: value, ...}, ...} 到 data/client/config/cfg_<name>.json。

产物：覆盖 data/client/config/cfg_<table>.json（先备份 .bak）
"""
import frida, time, json, sys, os, shutil

TABLES = {
    "system_effect": ("Tb_cfg_system_effect", "cfg_system_effect.json"),
    "weapon": ("Tb_cfg_weapon", "cfg_weapon.json"),
    "module": ("Tb_cfg_module", "cfg_module.json"),
    "ship_slot": ("Tb_cfg_ship_slot", "cfg_ship_slot.json"),
    "weapon_action": ("Tb_cfg_weapon_action", "cfg_weapon_action.json"),
    "ship": ("Tb_cfg_ship", "cfg_ship.json"),
    "ship_system": ("Tb_cfg_ship_system", "cfg_ship_system.json"),
    "system_enhance": ("Tb_cfg_system_enhance", "cfg_system_enhance.json"),
    "ship_type": ("Tb_cfg_ship_type", "cfg_ship_type.json"),
    "module_effect": ("Tb_cfg_module_effect", "cfg_module_effect.json"),
}


def make_probe(table_attr):
    return '''
import json, traceback, gc, os, tempfile
out = []
try:
    gc.collect()
    import data_manager.game_data_utils as gdu
    tbl = getattr(gdu, "TABLE_ATTR", None)
    out.append("tbl=%s type=%s" % (tbl is not None, type(tbl).__name__ if tbl else "None"))
    if tbl is None:
        out.append("TABLE_ATTR not in gdu")
    else:
        gad = getattr(tbl, "get_all_data", None)
        out.append("get_all_data=%s" % (gad is not None))
        if gad:
            data = gad()
            out.append("len=%d" % len(data))
            result = {}
            cnt = 0
            err_cnt = 0
            for k, v in data.items():
                try:
                    if hasattr(v, "get_origin_dict"):
                        d = v.get_origin_dict()
                    elif isinstance(v, dict):
                        d = v
                    else:
                        d = dict(v) if hasattr(v, "keys") else {"_value": str(v)}
                    # 转 JSON-safe（int/float/str/bool/None）
                    safe = {}
                    for fk, fv in d.items():
                        if isinstance(fv, (int, float, str, bool)) or fv is None:
                            safe[fk] = fv
                        elif isinstance(fv, (list, tuple)):
                            safe[fk] = [x if isinstance(x, (int, float, str, bool)) else str(x) for x in fv]
                        else:
                            safe[fk] = str(fv)
                    result[str(k)] = safe
                    cnt += 1
                except Exception:
                    err_cnt += 1
            p = os.path.join(tempfile.gettempdir(), "_full_table.json")
            with open(p, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False)
            out.append("FILE=%s" % p)
            out.append("WROTE=%d errs=%d" % (cnt, err_cnt))
except Exception:
    out.append("ERR=" + traceback.format_exc()[:1500])
probe_result = json.dumps(out, ensure_ascii=False, default=str)
'''.replace("TABLE_ATTR", table_attr)


def run_dump(table_name):
    if table_name not in TABLES:
        print(f"未知表: {table_name}。可选: {list(TABLES.keys())}")
        sys.exit(1)
    attr, outfile = TABLES[table_name]
    probe = make_probe(attr)

    JS = r'''var log=[];try{var py=Process.getModuleByName("python311.dll");var f=function(n){return py.getExportByName(n);};var Ens=new NativeFunction(f("PyGILState_Ensure"),"pointer",[]);var Rel=new NativeFunction(f("PyGILState_Release"),"void",["pointer"]);var Run=new NativeFunction(f("PyRun_SimpleString"),"int",["pointer"]);var AddM=new NativeFunction(f("PyImport_AddModule"),"pointer",["pointer"]);var GetA=new NativeFunction(f("PyObject_GetAttrString"),"pointer",["pointer","pointer"]);var Str=new NativeFunction(f("PyObject_Str"),"pointer",["pointer"]);var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),"pointer",["pointer"]);var pyCode=["import importlib.util, sys, os, tempfile","code = "+JSON.stringify(CODE_PLACEHOLDER),"tmpf = os.path.join(tempfile.gettempdir(), '_ft.py')","with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)","spec = importlib.util.spec_from_file_location('_ft', tmpf)","mod = importlib.util.module_from_spec(spec)","spec.loader.exec_module(mod)"].join("\\n");var c=Memory.allocUtf8String(pyCode);var g=Ens();var rc=Run(c);log.push("rc="+rc);if(rc==0){var m=AddM(Memory.allocUtf8String("__main__"));var v=GetA(m,Memory.allocUtf8String("mod"));if(!v.isNull()){var v2=GetA(v,Memory.allocUtf8String("probe_result"));if(!v2.isNull()){var s=Str(v2);var u=UTF8(s);if(!u.isNull())log.push("RESULT="+u.readUtf8String());}}}Rel(g);}catch(e){log.push("JSERR="+e);}send(JSON.stringify(log));'''.replace("CODE_PLACEHOLDER", json.dumps(probe))

    done=[False];res=[]
    def on_msg(m,d):
        if m["type"]=="send":res.append(m["payload"]);done[0]=True
        elif m["type"]=="error":res.append("ERR:"+m.get("description",""));done[0]=True
    ps=[p for p in frida.get_local_device().enumerate_processes() if "lagrange" in p.name.lower()]
    if not ps: print("NO_GAME");sys.exit(1)
    print(f"attach pid={ps[0].pid}, dumping {table_name} ({attr})...")
    s=frida.attach(ps[0].pid).create_script(JS);s.on("message",on_msg);s.load()
    for _ in range(600):
        if done[0]:break
        time.sleep(0.5)

    import tempfile
    for r in res:
        try:
            rf=None
            for line in json.loads(r):
                if isinstance(line,str) and line.startswith("RESULT="):
                    for il in json.loads(line[7:]):
                        print(" ",il)
                        if isinstance(il,str) and il.startswith("FILE="): rf=il[5:]
            if rf and os.path.exists(rf):
                data=json.load(open(rf,encoding="utf-8"))
                outpath = f"data/client/config/{outfile}"
                if os.path.exists(outpath):
                    shutil.copy(outpath, outpath+".bak")
                with open(outpath,"w",encoding="utf-8") as f: json.dump(data,f,ensure_ascii=False)
                print(f"\n★ wrote {outpath} ({len(data)} rows)")
        except Exception as e:
            print("err",e); print(r[:300])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python dump_full_table.py <table_name|all>")
        print(f"可选: {list(TABLES.keys())}")
        sys.exit(1)
    target = sys.argv[1]
    if target == "all":
        for t in TABLES:
            print(f"\n{'='*40} {t} {'='*40}")
            run_dump(t)
    else:
        run_dump(target)
