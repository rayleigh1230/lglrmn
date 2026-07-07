"""阶段1探针：批量导出整个模块的所有函数/方法/嵌套闭包。

策略：
  - 输入：模块名列表（默认 ['data.ship_attr_calc']）
  - 递归遍历：
      模块级函数 → 函数对象
      模块级类  → 类的所有方法（含继承的? 不含，只导本类定义的）
      方法       → func.__code__
      func.__code__.co_consts 中的 code object → 嵌套闭包
  - 对每个 code object 落盘四件套：
      <outdir>/<scope_path>/<name>.disasm.txt   (在游戏 3.11 内 dis.dis)
      <outdir>/<scope_path>/<name>.marshal.bin
      <outdir>/<scope_path>/<name>.pyc          (最小 .pyc，pycdc 输入)
      <outdir>/<scope_path>/<name>.meta.json    (names/varnames/consts/argcount/firstlineno)
  - 顶层 index.json 列出所有 dump 到的项
  - 同时 dump 模块级常量（C_*/V_*/类属性等）

用法：
  改 MODULES 列表加入要 dump 的模块，运行 _run_probe_v1.py（UAC 提权 wrapper）
"""
import frida, time, json, sys

# 要 dump 的模块列表
MODULES = [
    "data.ship_attr_calc",
]

PROBE_PY_TEMPLATE = '''\
import sys, traceback, dis, marshal, json, io, os, types, importlib.util
out = []
OUTDIR = r"{outdir}"
os.makedirs(OUTDIR, exist_ok=True)
MODULES = {modules}

def write_code_fourpack(co, scope_path, name_hint, source_hint):
    """对一个 code object 落盘四件套。返回 metadata dict。"""
    safe = (name_hint or co.co_name).replace("<", "_").replace(">", "_").replace("/", "_").replace("\\\\", "_").replace(":", "_").replace("|", "_").replace("?", "_").replace("*", "_").strip().rstrip(".")
    scope_safe = scope_path.replace("<", "_").replace(">", "_").replace(":", "_").replace("|", "_").replace("?", "_").replace("*", "_").replace("/", "_").replace("\\\\", "_").strip().rstrip(".")
    sub = os.path.join(OUTDIR, scope_safe)
    os.makedirs(sub, exist_ok=True)
    # marshal.bin
    try:
        mb = marshal.dumps(co)
    except Exception as e:
        with open(os.path.join(sub, safe + ".ERR.txt"), "w", encoding="utf-8") as f:
            f.write("marshal.dumps failed: " + repr(e))
        return None
    with open(os.path.join(sub, safe + ".marshal.bin"), "wb") as f:
        f.write(mb)
    # pyc
    magic = importlib.util.MAGIC_NUMBER
    with open(os.path.join(sub, safe + ".pyc"), "wb") as f:
        f.write(magic + b"\\x00"*12 + mb)
    # disasm.txt
    buf = io.StringIO()
    buf.write("# SCOPE: " + scope_path + "  NAME: " + name_hint + "\\n")
    buf.write("# SOURCE: " + source_hint + " line " + str(getattr(co, "co_firstlineno", "?")) + "\\n")
    buf.write("# argcount=" + str(co.co_argcount) + "\\n")
    buf.write("# co_names=" + json.dumps(list(co.co_names), ensure_ascii=False) + "\\n")
    buf.write("# co_varnames=" + json.dumps(list(co.co_varnames), ensure_ascii=False) + "\\n")
    consts_simple = [repr(c) for c in co.co_consts if isinstance(c, (int,float,str,bool,type(None)))]
    buf.write("# co_consts_simple=" + json.dumps(consts_simple, ensure_ascii=False) + "\\n")
    buf.write("\\n")
    try:
        dis.dis(co, file=buf)
    except Exception as e:
        buf.write("DIS_DIS_ERR=" + repr(e) + "\\n")
    with open(os.path.join(sub, safe + ".disasm.txt"), "w", encoding="utf-8") as f:
        f.write(buf.getvalue())
    # meta.json
    meta = {{
        "scope": scope_path,
        "name": name_hint,
        "co_name": co.co_name,
        "source_file": source_hint,
        "firstlineno": getattr(co, "co_firstlineno", None),
        "argcount": co.co_argcount,
        "names": list(co.co_names),
        "varnames": list(co.co_varnames),
        "consts_simple": consts_simple,
        "marshal_size": len(mb),
        "disasm_size": len(buf.getvalue()),
    }}
    with open(os.path.join(sub, safe + ".meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


def walk_nested(co, scope_path, source_hint, index, depth=0):
    """递归 co_consts 找嵌套 code object 并 dump。"""
    if depth > 8:  # 防御性深度限制
        return
    for x in co.co_consts:
        if hasattr(x, "co_code"):
            child_name = x.co_name
            # 注意：<nested> 含 <> 不能进 Windows 文件名，用 _nested_ 替代
            child_path = scope_path + "._nested_." + child_name
            try:
                meta = write_code_fourpack(x, child_path, child_name, source_hint)
                if meta:
                    meta["depth"] = depth + 1
                    meta["kind"] = "nested_closure"
                    index.append(meta)
            except Exception as e:
                out.append("NESTED_ERR " + child_path + " " + repr(e)[:200])
            walk_nested(x, child_path, source_hint, index, depth + 1)


def process_func(func, scope_path, source_hint, index, kind="function"):
    """处理一个函数对象，dump 它 + 嵌套闭包。"""
    if not hasattr(func, "__code__"):
        return
    co = func.__code__
    name = getattr(func, "__name__", co.co_name)
    try:
        meta = write_code_fourpack(co, scope_path, name, source_hint)
        if meta:
            meta["kind"] = kind
            index.append(meta)
    except Exception as e:
        out.append("FUNC_DUMP_ERR " + scope_path + " " + repr(e)[:200])
        return
    try:
        walk_nested(co, scope_path, source_hint, index)
    except Exception as e:
        out.append("WALK_NESTED_ERR " + scope_path + " " + repr(e)[:200])


def process_class(cls, parent_scope, source_hint, index):
    """处理一个类，遍历本类定义的所有方法。"""
    cls_scope = parent_scope + "." + cls.__name__
    # 只走 cls.__dict__，避免把继承的方法也 dump（避免重复）
    for attr_name, obj in cls.__dict__.items():
        if attr_name.startswith("__") and attr_name not in ("__init__", "__call__"):
            continue
        # 普通方法 / staticmethod / classmethod
        func = None
        kind = None
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
                    process_func(sub_func, cls_scope + ".<property>." + attr_name, source_hint, index, kind="property_" + sub_name)
            continue
        if func is not None:
            try:
                process_func(func, cls_scope + "." + attr_name, source_hint, index, kind=kind)
            except Exception as e:
                out.append("FUNC_ERR " + cls_scope + "." + attr_name + " " + repr(e)[:200])


def process_module(modname, index):
    """处理一个完整模块。"""
    try:
        mod = __import__(modname, fromlist=["__name__"])
    except Exception as e:
        out.append("IMPORT_ERR " + modname + " " + repr(e)[:200])
        return
    source_hint = getattr(mod, "__file__", modname) or modname
    mod_scope = modname
    mod_dir = os.path.join(OUTDIR, mod_scope.replace(".", "_"))
    os.makedirs(mod_dir, exist_ok=True)

    # 1. 模块级函数
    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"):
            continue
        try:
            obj = getattr(mod, attr_name)
        except Exception:
            continue
        if isinstance(obj, types.FunctionType):
            process_func(obj, mod_scope, source_hint, index, kind="module_func")
        elif isinstance(obj, type):
            # 2. 模块级类
            process_class(obj, mod_scope, source_hint, index)

    # 3. 模块级常量（C_*/V_*/其他大写常量）
    consts_out = {{}}
    for attr_name in sorted(dir(mod)):
        if attr_name.startswith("_"):
            continue
        try:
            v = getattr(mod, attr_name)
        except Exception:
            continue
        if isinstance(v, (int, float, str, bool, type(None))):
            consts_out[attr_name] = repr(v)
        elif isinstance(v, type) and v.__module__ == modname:
            # 类自身的属性（类级常量）
            for ca in sorted(dir(v)):
                if ca.startswith("_"): continue
                try:
                    cv = getattr(v, ca)
                except Exception:
                    continue
                if isinstance(cv, (int, float, str, bool, type(None))):
                    consts_out[v.__name__ + "." + ca] = repr(cv)
    with open(os.path.join(mod_dir, "_module_constants.json"), "w", encoding="utf-8") as f:
        json.dump(consts_out, f, ensure_ascii=False, indent=2)
    out.append("MOD_DONE " + modname + " consts=" + str(len(consts_out)))


try:
    BIG_INDEX = []
    for m in MODULES:
        out.append("MOD_BEGIN " + m)
        process_module(m, BIG_INDEX)
    # 写总索引
    with open(os.path.join(OUTDIR, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(BIG_INDEX, f, ensure_ascii=False, indent=2)
    out.append("TOTAL_CODES=" + str(len(BIG_INDEX)))
    out.append("OUTDIR=" + OUTDIR)
except Exception:
    out.append("TOPERR=" + traceback.format_exc()[:3000])

_probe_out = json.dumps(out, ensure_ascii=False)
'''


def build_probe_py():
    return PROBE_PY_TEMPLATE.format(
        outdir=r"E:\\星际猎人\\dumped\\modules",
        modules=repr(MODULES),
    )

PROBE_PY = build_probe_py()

JS = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }

    var Ens = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var Rel = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var Run = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var AddM = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var GetA = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var Str  = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var UTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    var PY_CODE = """ + json.dumps(PROBE_PY) + r""";
    var code = Memory.allocUtf8String(PY_CODE);
    var gil = Ens();
    var rc = Run(code);
    log.push("PyRun_SimpleString rc=" + rc);
    if (rc == 0) {
        var mod = AddM(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = GetA(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = Str(v);
                var cs = UTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
                else log.push("UTF8 null");
            } else { log.push("_probe_out null"); }
        } else { log.push("__main__ null"); }
    }
    Rel(gil);
} catch(e) {
    log.push("JSERR=" + e + " stack=" + (e.stack||""));
}
send(JSON.stringify(log));
"""

done = [False]; res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"]); done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description","") + " | " + m.get("stack","")); done[0] = True

ps = [p for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not ps:
    print("NO_GAME"); sys.exit(1)
print("attach", ps[0].pid, "...")
s = frida.attach(ps[0].pid).create_script(JS)
s.on('message', on_msg)
s.load()
for _ in range(120):  # 模块全量 dump 比 single func 慢，给 60s
    if done[0]: break
    time.sleep(0.5)

if not res:
    print("TIMEOUT"); sys.exit(1)

# 落盘原始结果（含 PYRESULT 的字符串数组）
RAW = r"E:\星际猎人\probe_module_walk_raw.json"
with open(RAW, "w", encoding="utf-8") as f:
    f.write(res[0])
print("RAW_WRITTEN=" + RAW)

# stdout 摘要
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
