"""针对 data_manager.game_data_utils 的精确 dump 探针。

背景：probe_module_walk_all.py 的 DISCOVERY_ROOTS 漏了 data_manager 包，
        导致 game_data_utils 从未被 dump。本脚本补全这个缺口。

用法：
  1. 启动游戏 infinite_lagrange_cn.exe（需登录进主界面，蓝图系统已加载）
  2. 运行本脚本（需 UAC 提权，或管理员终端）
  python dump_game_data_utils.py

产物：
  E:\战斗模拟器\dumped\gdu_raw\data_manager.game_data_utils\
    ├── _index.json
    ├── _module_constants.json
    └── <function_name>/
        ├── <name>.marshal.bin
        ├── <name>.pyc
        ├── <name>.disasm.txt
        └── <name>.meta.json
"""
import frida, time, json, sys, os

MODULE = "data_manager.game_data_utils"
OUT_DIR_HOST = r"E:\战斗模拟器\dumped\gdu_raw"

# Host 端写 payload 文件（复用 probe_module_walk_all.py 的文件 exec 模式）
PAYLOAD_FILE = r"E:\星际猎人\_payload_gdu.py"

PROBE_PY_TEMPLATE = '''\
import sys, traceback, dis, marshal, json, io, os, types, importlib, importlib.util
out = []
TARGET = "{target_module}"
OUTDIR = r"{outdir}"
os.makedirs(OUTDIR, exist_ok=True)

BAD_CHARS = "<>:|?*/\\\\"
def sanitize(s):
    for c in BAD_CHARS:
        s = s.replace(c, "_")
    return s.strip().rstrip(".")

def write_code_fourpack(co, scope_path, name_hint, source_hint):
    safe = sanitize(name_hint or co.co_name)
    scope_safe = sanitize(scope_path)
    sub = os.path.join(OUTDIR, scope_safe, safe)
    os.makedirs(sub, exist_ok=True)
    try:
        mb = marshal.dumps(co)
    except Exception as e:
        with open(os.path.join(sub, ".ERR.txt"), "w", encoding="utf-8") as f:
            f.write("marshal.dumps failed: " + repr(e))
        return None
    with open(os.path.join(sub, safe + ".marshal.bin"), "wb") as f:
        f.write(mb)
    magic = importlib.util.MAGIC_NUMBER
    with open(os.path.join(sub, safe + ".pyc"), "wb") as f:
        f.write(magic + b"\\x00"*12 + mb)
    buf = io.StringIO()
    buf.write("# SCOPE: " + scope_path + "  NAME: " + name_hint + "\\n")
    buf.write("# SOURCE: " + source_hint + " line " + str(getattr(co, "co_firstlineno", "?")) + "\\n")
    buf.write("# argcount=" + str(co.co_argcount) + "  nlocals=" + str(co.co_nlocals) + "\\n")
    buf.write("# stacksize=" + str(co.co_stacksize) + "  flags=" + str(co.co_flags) + "\\n")
    buf.write("# co_names=" + json.dumps(list(co.co_names), ensure_ascii=False) + "\\n")
    buf.write("# co_varnames=" + json.dumps(list(co.co_varnames), ensure_ascii=False) + "\\n")
    consts_simple = [repr(c) for c in co.co_consts if isinstance(c, (int,float,str,bool,type(None)))]
    buf.write("# co_consts_simple=" + json.dumps(consts_simple, ensure_ascii=False) + "\\n\\n")
    try:
        dis.dis(co, file=buf)
    except Exception as e:
        buf.write("DIS_DIS_ERR=" + repr(e) + "\\n")
    with open(os.path.join(sub, safe + ".disasm.txt"), "w", encoding="utf-8") as f:
        f.write(buf.getvalue())
    meta = {{
        "scope": scope_path, "name": name_hint, "co_name": co.co_name,
        "source_file": source_hint, "firstlineno": getattr(co, "co_firstlineno", None),
        "argcount": co.co_argcount, "nlocals": co.co_nlocals,
        "stacksize": co.co_stacksize, "flags": co.co_flags,
        "names": list(co.co_names), "varnames": list(co.co_varnames),
        "consts_simple": consts_simple,
        "marshal_size": len(mb), "disasm_size": len(buf.getvalue()),
    }}
    with open(os.path.join(sub, safe + ".meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta

def walk_nested(co, scope_path, source_hint, index, depth=0):
    if depth > 12:
        return
    for x in co.co_consts:
        if hasattr(x, "co_code"):
            child_name = x.co_name
            child_path = scope_path + "._nested_." + child_name
            try:
                meta = write_code_fourpack(x, child_path, child_name, source_hint)
                if meta:
                    meta["depth"] = depth + 1
                    meta["kind"] = "nested_closure"
                    index.append(meta)
            except Exception as e:
                out.append("NESTED_ERR " + child_path + " " + repr(e)[:150])
            walk_nested(x, child_path, source_hint, index, depth + 1)

def process_func(func, scope_path, source_hint, index, kind="function"):
    if not hasattr(func, "__code__"): return
    co = func.__code__
    name = getattr(func, "__name__", co.co_name)
    try:
        meta = write_code_fourpack(co, scope_path, name, source_hint)
        if meta:
            meta["kind"] = kind
            index.append(meta)
    except Exception as e:
        out.append("FUNC_DUMP_ERR " + scope_path + " " + repr(e)[:150])
        return
    try:
        walk_nested(co, scope_path, source_hint, index)
    except Exception as e:
        out.append("WALK_NESTED_ERR " + scope_path + " " + repr(e)[:150])

def process_class(cls, parent_scope, source_hint, index):
    cls_scope = parent_scope + "." + cls.__name__
    for attr_name, obj in cls.__dict__.items():
        if attr_name.startswith("__") and attr_name not in ("__init__", "__call__"):
            continue
        func = None; kind = None
        if isinstance(obj, types.FunctionType):
            func = obj; kind = "method"
        elif isinstance(obj, staticmethod):
            f = getattr(obj, "__func__", None)
            if f: func = f; kind = "staticmethod"
        elif isinstance(obj, classmethod):
            f = getattr(obj, "__func__", None)
            if f: func = f; kind = "classmethod"
        elif isinstance(obj, property):
            for sub_name, sub_func in [("getter", obj.fget), ("setter", obj.fset), ("deleter", obj.fdel)]:
                if sub_func:
                    process_func(sub_func, cls_scope + "._property_." + attr_name, source_hint, index, kind="property_" + sub_name)
            continue
        if func is not None:
            try:
                process_func(func, cls_scope + "." + attr_name, source_hint, index, kind=kind)
            except Exception as e:
                out.append("FUNC_ERR " + cls_scope + "." + attr_name + " " + repr(e)[:150])

def process_module(modname, index):
    try:
        mod = __import__(modname, fromlist=["__name__"])
    except Exception as e:
        out.append("IMPORT_ERR " + modname + " " + repr(e)[:200])
        return False
    source_hint = getattr(mod, "__file__", modname) or modname
    mod_scope = modname
    out.append("MOD_LOADED " + modname + " source=" + str(source_hint)[:200])

    # 统计
    func_count = 0; class_count = 0; nested_count = 0
    before = len(index)

    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"): continue
        try:
            obj = getattr(mod, attr_name)
        except Exception:
            continue
        if isinstance(obj, types.FunctionType):
            func_count += 1
            process_func(obj, mod_scope, source_hint, index, kind="module_func")
        elif isinstance(obj, type):
            class_count += 1
            try:
                process_class(obj, mod_scope, source_hint, index)
            except Exception as e:
                out.append("CLASS_ERR " + mod_scope + "." + attr_name + " " + repr(e)[:150])

    after = len(index)
    new_codes = after - before
    out.append("MOD_STATS " + modname + " funcs=" + str(func_count) + " classes=" + str(class_count) + " codes=" + str(new_codes))

    # 常量
    consts_out = {{}}
    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"): continue
        try: v = getattr(mod, attr_name)
        except Exception: continue
        if isinstance(v, (int, float, str, bool, type(None))):
            consts_out[attr_name] = repr(v)
    try:
        with open(os.path.join(OUTDIR, mod_scope.replace(".", "_"), "_module_constants.json"), "w", encoding="utf-8") as f:
            json.dump(consts_out, f, ensure_ascii=False, indent=2)
    except Exception as e:
        out.append("CONST_WRITE_ERR " + repr(e)[:150])
    out.append("CONSTS=" + str(len(consts_out)))
    return True


try:
    BIG_INDEX = []
    ok = process_module(TARGET, BIG_INDEX)
    with open(os.path.join(OUTDIR, TARGET.replace(".", "_"), "_index.json"), "w", encoding="utf-8") as f:
        json.dump(BIG_INDEX, f, ensure_ascii=False)
    summary = {{
        "module": TARGET,
        "loaded_ok": ok,
        "total_code_objects": len(BIG_INDEX),
    }}
    with open(os.path.join(OUTDIR, TARGET.replace(".", "_"), "_discovery.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    out.append("DONE ok=" + str(ok) + " codes=" + str(len(BIG_INDEX)))
    out.append("OUTDIR=" + OUTDIR)
except Exception:
    out.append("TOPERR=" + traceback.format_exc()[:3000])

_probe_out = json.dumps(out, ensure_ascii=False)
'''


def write_payload():
    payload = PROBE_PY_TEMPLATE.format(
        target_module=MODULE,
        outdir=OUT_DIR_HOST,
    )
    os.makedirs(os.path.dirname(PAYLOAD_FILE), exist_ok=True)
    with open(PAYLOAD_FILE, "w", encoding="utf-8") as f:
        f.write(payload)
    return payload


# 极小 JS：exec payload 文件
JS = r'''
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    var Ens = new NativeFunction(pyMod.getExportByName("PyGILState_Ensure"),'pointer',[]);
    var Rel = new NativeFunction(pyMod.getExportByName("PyGILState_Release"),'void',['pointer']);
    var Run = new NativeFunction(pyMod.getExportByName("PyRun_SimpleString"),'int',['pointer']);
    var AddM = new NativeFunction(pyMod.getExportByName("PyImport_AddModule"),'pointer',['pointer']);
    var GetA = new NativeFunction(pyMod.getExportByName("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str  = new NativeFunction(pyMod.getExportByName("PyObject_Str"),'pointer',['pointer']);
    var UTF8 = new NativeFunction(pyMod.getExportByName("PyUnicode_AsUTF8"),'pointer',['pointer']);
    var payload_path = "''' + PAYLOAD_FILE.replace("\\", "\\\\") + r'''";
    var pyCode = "exec(open('" + payload_path + "', encoding='utf-8').read())";
    var code = Memory.allocUtf8String(pyCode);
    var gil = Ens();
    var rc = Run(code);
    log.push("PyRun_SimpleString rc=" + rc);
    if (rc == 0) {
        var mod = AddM(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = GetA(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = Str(v); var cs = UTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
            } else { log.push("_probe_out null"); }
        }
    }
    Rel(gil);
} catch(e) { log.push("JSERR=" + e + " stack=" + (e.stack||"")); }
send(JSON.stringify(log));
'''


def main():
    # 写 payload
    payload = write_payload()
    print(f"Payload written: {PAYLOAD_FILE} ({len(payload)} bytes)")
    print(f"Output dir: {OUT_DIR_HOST}")

    # 找游戏进程
    ps = [p for p in frida.get_local_device().enumerate_processes()
          if p.name == "infinite_lagrange_cn.exe"]
    if not ps:
        print("ERROR: 游戏未运行！请先启动 infinite_lagrange_cn.exe 并进入主界面（蓝图系统已加载）")
        sys.exit(1)

    print(f"Attaching to PID {ps[0].pid} ...")
    s = frida.attach(ps[0].pid).create_script(JS)
    done = [False]
    res = []

    def on_msg(m, d):
        if m["type"] == "send":
            res.append(m["payload"])
            done[0] = True
        elif m["type"] == "error":
            res.append("JSERR:" + m.get("description", "") + " | " + m.get("stack", ""))
            done[0] = True

    s.on('message', on_msg)
    s.load()

    # 单个模块 dump 很快，给 60s
    for _ in range(120):
        if done[0]:
            break
        time.sleep(0.5)

    if not res:
        print("TIMEOUT: frida 未在 60s 内返回。可能游戏卡死或模块导入失败。")
        sys.exit(1)

    raw_out = os.path.join(os.path.dirname(PAYLOAD_FILE), "probe_gdu_raw.json")
    with open(raw_out, "w", encoding="utf-8") as f:
        f.write(res[0])
    print(f"Raw result: {raw_out}")

    # 打印摘要
    try:
        for line in json.loads(res[0]):
            if line.startswith("PYRESULT="):
                try:
                    items = json.loads(line[len("PYRESULT="):])
                    for it in items:
                        print("  " + it[:300])
                except Exception as e:
                    print("  parse err:", e)
            else:
                print("  " + line[:300])
    except Exception as e:
        print("err:", e)
        for r in res:
            print(r)


if __name__ == "__main__":
    main()
