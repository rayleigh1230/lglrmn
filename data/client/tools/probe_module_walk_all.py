"""阶段1-扩展探针（文件 exec 模式）：自动发现并 dump 所有公式相关模块。

为什么用文件 exec：
  - 内联 PROBE_PY > ~7.5KB 时 frida `s.load()` 会超时（V8 解析大字符串常量开销）
  - 改成 host 端写 payload 文件 → JS 只跑 `exec(open(file).read())` → JS 体量恒定 ~1KB

策略：
  1. Host 写 PROBE_PY 到 E:\\星际猎人\\_walk_all_payload.py
  2. Frida attach + 极小 JS：exec 文件 → 结果存 _probe_out → send 回传
  3. 顶层 package 用 pkgutil.walk_packages 递归发现子模块
  4. 同时快照 sys.modules
  5. 每个模块单独 try/except
"""
import frida, time, json, sys, os

# 顶层 package：用 pkgutil 递归发现所有子模块
DISCOVERY_ROOTS = [
    "data",                  # 数据/计算层（最高优先级）
    "common",                # 含 common.config.db / common_definition
    "scene_zoom0",           # 战斗场景
    "configdata",            # 顶层常量（含武器命中率等）
    "common_definition",     # 顶层常量
]

# 显式补充
EXPLICIT_MODULES = [
    "ui.ship_blueprint_module_adjust",
    "ui.ship_blueprint",
    "ui.ship_blueprint_enhance",
]

# 跳过的子串
SKIP_SUBSTRINGS = [
    ".test", ".tests", ".debug", "_test", "test_",
    ".editor", ".animation", ".anim_", ".particle",
    ".sound", ".audio", ".music", ".voice",
    ".texture", ".shader", ".model", ".asset_",
    ".profiler", ".log_", ".debugger",
]

# Host 端写的 payload 文件路径
PAYLOAD_FILE = r"E:\星际猎人\_payload.py"
OUT_DIR_HOST = r"E:\星际猎人\dumped\modules_all"

# === Payload 模板（游戏 Python 3.11 内执行）===
PROBE_PY_TEMPLATE = '''\
import sys, traceback, dis, marshal, json, io, os, types, importlib, importlib.util, pkgutil
out = []
OUTDIR = r"{outdir}"
os.makedirs(OUTDIR, exist_ok=True)
DISCOVERY_ROOTS = {roots}
EXPLICIT = {explicit}
SKIP_SUBSTRINGS = {skip}

# === 阶段A: 模块发现 ===
discovered = set()
import_errors = {{}}
for root in DISCOVERY_ROOTS:
    try:
        importlib.import_module(root)
    except Exception as e:
        import_errors[root] = repr(e)[:200]
        continue
    if root not in sys.modules:
        continue
    pkg = sys.modules[root]
    discovered.add(root)
    if not hasattr(pkg, "__path__"):
        continue
    try:
        for finder, name, ispkg in pkgutil.walk_packages(pkg.__path__, prefix=root + ".", onerror=lambda n: None):
            discovered.add(name)
    except Exception as e:
        out.append("WALK_ERR " + root + " " + repr(e)[:200])

for name in list(sys.modules.keys()):
    for root in DISCOVERY_ROOTS:
        if name == root or name.startswith(root + "."):
            discovered.add(name)
            break

for m in EXPLICIT:
    discovered.add(m)

def should_skip(name):
    low = name.lower()
    for s in SKIP_SUBSTRINGS:
        if s in low:
            return True
    return False

module_list = sorted(m for m in discovered if not should_skip(m))
out.append("DISCOVERED_TOTAL=" + str(len(discovered)))
out.append("AFTER_SKIP=" + str(len(module_list)))


# === 阶段B: 单个 code object 落盘四件套 ===
BAD_CHARS = "<>:|?*/\\\\"
def sanitize(s):
    for c in BAD_CHARS:
        s = s.replace(c, "_")
    return s.strip().rstrip(".")

def write_code_fourpack(co, scope_path, name_hint, source_hint):
    safe = sanitize(name_hint or co.co_name)
    scope_safe = sanitize(scope_path)
    sub = os.path.join(OUTDIR, scope_safe)
    os.makedirs(sub, exist_ok=True)
    try:
        mb = marshal.dumps(co)
    except Exception as e:
        with open(os.path.join(sub, safe + ".ERR.txt"), "w", encoding="utf-8") as f:
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
    buf.write("# argcount=" + str(co.co_argcount) + "\\n")
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
        "argcount": co.co_argcount,
        "names": list(co.co_names), "varnames": list(co.co_varnames),
        "consts_simple": consts_simple,
        "marshal_size": len(mb), "disasm_size": len(buf.getvalue()),
    }}
    with open(os.path.join(sub, safe + ".meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


def walk_nested(co, scope_path, source_hint, index, depth=0):
    if depth > 8: return
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
        import_errors[modname] = repr(e)[:200]
        return False
    source_hint = getattr(mod, "__file__", modname) or modname
    mod_scope = modname
    mod_dir = os.path.join(OUTDIR, mod_scope.replace(".", "_"))
    os.makedirs(mod_dir, exist_ok=True)
    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"): continue
        try:
            obj = getattr(mod, attr_name)
        except Exception:
            continue
        if isinstance(obj, types.FunctionType):
            process_func(obj, mod_scope, source_hint, index, kind="module_func")
        elif isinstance(obj, type):
            try:
                process_class(obj, mod_scope, source_hint, index)
            except Exception as e:
                out.append("CLASS_ERR " + mod_scope + "." + attr_name + " " + repr(e)[:150])
    consts_out = {{}}
    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"): continue
        try: v = getattr(mod, attr_name)
        except Exception: continue
        if isinstance(v, (int, float, str, bool, type(None))):
            consts_out[attr_name] = repr(v)
        elif isinstance(v, type) and v.__module__ == modname:
            for ca in sorted(dir(v)):
                if ca.startswith("_"): continue
                try: cv = getattr(v, ca)
                except Exception: continue
                if isinstance(cv, (int, float, str, bool, type(None))):
                    consts_out[v.__name__ + "." + ca] = repr(cv)
    try:
        with open(os.path.join(mod_dir, "_module_constants.json"), "w", encoding="utf-8") as f:
            json.dump(consts_out, f, ensure_ascii=False, indent=2)
    except Exception as e:
        out.append("CONST_WRITE_ERR " + modname + " " + repr(e)[:150])
    return True


# === 阶段C: 执行 ===
try:
    BIG_INDEX = []
    ok_count = 0; fail_count = 0
    for i, m in enumerate(module_list):
        if process_module(m, BIG_INDEX):
            ok_count += 1
        else:
            fail_count += 1
        if (i + 1) % 20 == 0:
            out.append("PROGRESS " + str(i+1) + "/" + str(len(module_list)) + " ok=" + str(ok_count) + " fail=" + str(fail_count))
    with open(os.path.join(OUTDIR, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(BIG_INDEX, f, ensure_ascii=False)
    discovery_summary = {{
        "discovered_total": len(discovered),
        "after_skip": len(module_list),
        "modules_dumped_ok": ok_count,
        "modules_import_failed": fail_count,
        "import_errors": import_errors,
        "total_code_objects": len(BIG_INDEX),
        "module_list": module_list,
    }}
    with open(os.path.join(OUTDIR, "_discovery.json"), "w", encoding="utf-8") as f:
        json.dump(discovery_summary, f, ensure_ascii=False, indent=2)
    out.append("DONE modules_ok=" + str(ok_count) + " modules_fail=" + str(fail_count) + " codes=" + str(len(BIG_INDEX)))
    out.append("OUTDIR=" + OUTDIR)
except Exception:
    out.append("TOPERR=" + traceback.format_exc()[:3000])

_probe_out = json.dumps(out, ensure_ascii=False)
'''


def write_payload_file():
    payload = PROBE_PY_TEMPLATE.format(
        outdir=OUT_DIR_HOST,
        roots=repr(DISCOVERY_ROOTS),
        explicit=repr(EXPLICIT_MODULES),
        skip=repr(SKIP_SUBSTRINGS),
    )
    with open(PAYLOAD_FILE, "w", encoding="utf-8") as f:
        f.write(payload)
    return payload


# 极小 JS：只负责 exec payload 文件
JS_TEMPLATE = r'''
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
    var payload_path = "PAYLOAD_PATH_PLACEHOLDER";
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
    payload = write_payload_file()
    print("payload written, size:", len(payload))

    # payload 路径里的反斜杠在 JS 字符串里要转义
    payload_path_js = PAYLOAD_FILE.replace("\\", "\\\\")
    JS = JS_TEMPLATE.replace("PAYLOAD_PATH_PLACEHOLDER", payload_path_js)
    print("JS size:", len(JS))

    ps = [p for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
    if not ps:
        print("NO_GAME"); sys.exit(1)
    print("attach", ps[0].pid, "...")
    s = frida.attach(ps[0].pid).create_script(JS)
    done = [False]; res = []
    def on_msg(m, d):
        if m["type"] == "send":
            res.append(m["payload"]); done[0] = True
        elif m["type"] == "error":
            res.append("JSERR:" + m.get("description","") + " | " + m.get("stack","")); done[0] = True
    s.on('message', on_msg)
    s.load()
    # 给 5 分钟（全模块 dump 可能较慢）
    for _ in range(600):
        if done[0]: break
        time.sleep(0.5)

    if not res:
        print("TIMEOUT"); sys.exit(1)

    RAW = r"E:\星际猎人\probe_module_walk_all_raw.json"
    with open(RAW, "w", encoding="utf-8") as f:
        f.write(res[0])
    print("RAW_WRITTEN=" + RAW)

    try:
        for line in json.loads(res[0]):
            if line.startswith("PYRESULT="):
                try:
                    items = json.loads(line[len("PYRESULT="):])
                    for it in items:
                        print("  " + it[:300])
                except Exception as e:
                    print("  parse err:", e)
                    print("  " + line[:2000])
            else:
                print("  " + line[:300])
    except Exception as e:
        print("err:", e)
        for r in res: print(r)


if __name__ == "__main__":
    main()
