"""阶段0探针：验证游戏内存中 func.__code__ 是否为标准 CPython 3.11 字节码。

判据：
  - dis.dis(func) 打印标准指令助记符 (LOAD_GLOBAL/LOAD_ATTR/BINARY_OP/RETURN_VALUE)
  - co_code 头部字节匹配 CPython 3.11 模式
  - marshal.dumps(func.__code__) 不抛异常

通过任一公式方法（BlueprintAttrCalc.get_ship_dps_calc 等）验证。
若全部通过 → 客户端公式解密只剩工作量问题，进阶段1批量导出。
"""
import frida, time, json, sys

# 阶段0注入的 Python 代码（在游戏解释器里执行）
# 用字符串拼接避免 JS 模板字符串冲突（沿用 inject_probe3 风格）
PROBE_PY = (
    "import sys, traceback, io, dis, marshal, base64, json\n"
    "out = []\n"
    "try:\n"
    "    import data.ship_attr_calc as sac\n"
    "    out.append('MOD=' + str(sac.__file__) if hasattr(sac, '__file__') else 'MOD=builtin')\n"
    "    out.append('MOD_ATTRS=' + str([x for x in dir(sac) if not x.startswith('_')][:40]))\n"
    "\n"
    "    # 候选公式方法（按 dump_dps_methods.py 的目标列表）\n"
    "    candidates_cls = ['BlueprintAttrCalc', 'AttackCalculator', 'DPSCalculator', 'EnhanceCalculator']\n"
    "    cls_name = None\n"
    "    for c in candidates_cls:\n"
    "        if hasattr(sac, c):\n"
    "            cls_name = c\n"
    "            break\n"
    "    out.append('CLS=' + str(cls_name))\n"
    "\n"
    "    if cls_name is None:\n"
    "        out.append('NO_TARGET_CLS')\n"
    "    else:\n"
    "        cls = getattr(sac, cls_name)\n"
    "        # 找一个实际存在的方法\n"
    "        method_names = ['get_ship_dps_calc', 'get_ship_dps', 'get_weapon_ship_dps_calc',\n"
    "                        'get_weapon_attack_calc', 'calculate']\n"
    "        mname = None\n"
    "        for n in method_names:\n"
    "            if hasattr(cls, n):\n"
    "                mname = n\n"
    "                break\n"
    "        out.append('METHOD=' + str(mname))\n"
    "\n"
    "        if mname is not None:\n"
    "            m = getattr(cls, mname)\n"
    "            func = m.__func__ if hasattr(m, '__func__') else m\n"
    "            co = func.__code__\n"
    "\n"
    "            # 1. 元数据（已知可读，作为基准对照）\n"
    "            out.append('co_argcount=' + str(co.co_argcount))\n"
    "            out.append('co_names=' + json.dumps(list(co.co_names)))\n"
    "            out.append('co_varnames=' + json.dumps(list(co.co_varnames))[:400])\n"
    "            consts_simple = [c for c in co.co_consts if isinstance(c, (int, float, str, bool, type(None)))]\n"
    "            out.append('co_consts_simple=' + json.dumps([repr(c) for c in consts_simple])[:600])\n"
    "\n"
    "            # 2. 关键验证1: 原始字节码字节\n"
    "            cc = co.co_code\n"
    "            out.append('co_code_len=' + str(len(cc)))\n"
    "            out.append('co_code_head_hex=' + cc[:64].hex())\n"
    "\n"
    "            # 3. 关键验证2: dis.dis 反汇编\n"
    "            buf = io.StringIO()\n"
    "            dis.dis(func, file=buf)\n"
    "            disasm = buf.getvalue()\n"
    "            out.append('DISASM_LEN=' + str(len(disasm)))\n"
    "            # 截前 1500 字符看指令助记符\n"
    "            out.append('DISASM_HEAD=' + disasm[:1500])\n"
    "\n"
    "            # 4. 关键验证3: marshal.dumps 是否成功\n"
    "            try:\n"
    "                mb = marshal.dumps(co)\n"
    "                out.append('MARSHAL_OK len=' + str(len(mb)))\n"
    "                # 不通过 send 回传完整 marshal (阶段1再做)，只回传头部魔法字节\n"
    "                out.append('MARSHAL_HEAD_HEX=' + mb[:32].hex())\n"
    "            except Exception as me:\n"
    "                out.append('MARSHAL_ERR=' + repr(me)[:200])\n"
    "\n"
    "            # 5. 旁证: 本机 magic number 与运行版本\n"
    "            import importlib.util\n"
    "            out.append('PY_VERSION=' + sys.version)\n"
    "            out.append('MAGIC_HEX=' + importlib.util.MAGIC_NUMBER.hex())\n"
    "\n"
    "except Exception:\n"
    "    out.append('TOPERR=' + traceback.format_exc()[:2000])\n"
    "\n"
    "_probe_out = json.dumps(out, ensure_ascii=False)\n"
)

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

done = [False]
res = []
def on_msg(m, d):
    if m["type"] == "send":
        res.append(m["payload"]); done[0] = True
    elif m["type"] == "error":
        res.append("JSERR:" + m.get("description","") + " | " + m.get("stack","")); done[0] = True

ps = [p for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not ps:
    print("NO_GAME")
    sys.exit(1)
print("attach", ps[0].pid, "...")
s = frida.attach(ps[0].pid).create_script(JS)
s.on('message', on_msg)
s.load()
for _ in range(60):
    if done[0]: break
    time.sleep(0.5)

if not res:
    print("TIMEOUT")
    sys.exit(1)

# 解析并打印
try:
    for line in json.loads(res[0]):
        if line.startswith("PYRESULT="):
            try:
                items = json.loads(line[len("PYRESULT="):])
                for it in items:
                    print("  " + it)
            except Exception as e:
                print("  parse err:", e)
                print("  " + line[:2000])
        else:
            print("  " + line)
except Exception as e:
    print("err:", e)
    for r in res: print(r)
