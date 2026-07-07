"""阶段0-B探针：在游戏 Python 3.11 内完成 disasm + marshal，直接落盘。

策略：
  - 本机是 Python 3.13，dis.dis 不兼容 3.11 code object
  - 改成在游戏 3.11 解释器里直接跑 dis.dis 到 StringIO
  - 同时 marshal.dumps 落盘 .bin（供后续 pycdc 反编译用）
  - 元数据（names/consts/varnames）落盘 .json
  - 全部写到 E:\\星际猎人\\dumped\\formula_probe\\

游戏外解析脚本（parse_probe_v1.py）：读这些文件做摘要
"""
import frida, time, json, sys

PROBE_PY = (
    "import sys, traceback, dis, marshal, base64, json, io, os\n"
    "out = []\n"
    "OUTDIR = r'E:\\星际猎人\\dumped\\formula_probe'\n"
    "os.makedirs(OUTDIR, exist_ok=True)\n"
    "try:\n"
    "    import data.ship_attr_calc as sac\n"
    "    m = sac.BlueprintAttrCalc.get_ship_dps_calc\n"
    "    func = m.__func__ if hasattr(m, '__func__') else m\n"
    "    co = func.__code__\n"
    "\n"
    "    # 1. 完整 marshal bytes 落盘\n"
    "    mb = marshal.dumps(co)\n"
    "    with open(os.path.join(OUTDIR, 'get_ship_dps_calc.marshal.bin'), 'wb') as f:\n"
    "        f.write(mb)\n"
    "    out.append('MARSHAL_LEN=' + str(len(mb)))\n"
    "\n"
    "    # 2. 最小 .pyc（pycdc 用）\n"
    "    import importlib.util\n"
    "    magic = importlib.util.MAGIC_NUMBER\n"
    "    pyc_header = magic + b'\\x00'*12\n"
    "    with open(os.path.join(OUTDIR, 'get_ship_dps_calc.pyc'), 'wb') as f:\n"
    "        f.write(pyc_header + mb)\n"
    "    out.append('PYC_WRITTEN magic_hex=' + magic.hex())\n"
    "\n"
    "    # 3. 完整 dis.dis 落盘（在游戏 3.11 解释器里跑，无版本兼容问题）\n"
    "    buf = io.StringIO()\n"
    "    buf.write('# Restored from data.ship_attr_calc.BlueprintAttrCalc.get_ship_dps_calc\\n')\n"
    "    buf.write('# Source: data/ship_attr_calc.py line ' + str(co.co_firstlineno) + '\\n')\n"
    "    buf.write('# argcount=' + str(co.co_argcount) + '\\n')\n"
    "    buf.write('# co_names=' + json.dumps(list(co.co_names)) + '\\n')\n"
    "    buf.write('# co_varnames=' + json.dumps(list(co.co_varnames)) + '\\n')\n"
    "    buf.write('\\n')\n"
    "    dis.dis(co, file=buf)\n"
    "    disasm_text = buf.getvalue()\n"
    "    with open(os.path.join(OUTDIR, 'get_ship_dps_calc.disasm.txt'), 'w', encoding='utf-8') as f:\n"
    "        f.write(disasm_text)\n"
    "    out.append('DISASM_LEN=' + str(len(disasm_text)))\n"
    "\n"
    "    # 4. 递归嵌套 code object 的反汇编（每个嵌套都单独 dump）\n"
    "    nested_index = []\n"
    "    def walk(c, path, depth=0):\n"
    "        if depth > 0:\n"
    "            nested_index.append({\n"
    "                'path': path,\n"
    "                'name': c.co_name,\n"
    "                'argcount': c.co_argcount,\n"
    "                'firstlineno': getattr(c, 'co_firstlineno', None),\n"
    "                'names': list(c.co_names),\n"
    "                'varnames': list(c.co_varnames),\n"
    "                'consts_simple': [repr(x) for x in c.co_consts if isinstance(x, (int,float,str,bool,type(None)))],\n"
    "            })\n"
    "            # 每个嵌套单独 disasm\n"
    "            nbuf = io.StringIO()\n"
    "            nbuf.write('# NESTED ' + path + '\\n')\n"
    "            dis.dis(c, file=nbuf)\n"
    "            safe_name = path.replace('.', '_').replace('/', '_')\n"
    "            with open(os.path.join(OUTDIR, 'nested_' + safe_name + '.disasm.txt'), 'w', encoding='utf-8') as nf:\n"
    "                nf.write(nbuf.getvalue())\n"
    "        for x in c.co_consts:\n"
    "            if hasattr(x, 'co_code'):\n"
    "                walk(x, path + '.' + x.co_name, depth + 1)\n"
    "    walk(co, 'root', 0)\n"
    "    with open(os.path.join(OUTDIR, 'nested_index.json'), 'w', encoding='utf-8') as f:\n"
    "        json.dump(nested_index, f, ensure_ascii=False, indent=2)\n"
    "    out.append('NESTED_COUNT=' + str(len(nested_index)))\n"
    "\n"
    "    # 5. 顶部元数据 JSON\n"
    "    meta = {\n"
    "        'module': 'data.ship_attr_calc',\n"
    "        'class': 'BlueprintAttrCalc',\n"
    "        'method': 'get_ship_dps_calc',\n"
    "        'source_file': 'data/ship_attr_calc.py',\n"
    "        'firstlineno': co.co_firstlineno,\n"
    "        'argcount': co.co_argcount,\n"
    "        'names': list(co.co_names),\n"
    "        'varnames': list(co.co_varnames),\n"
    "        'consts_simple': [repr(x) for x in co.co_consts if isinstance(x, (int,float,str,bool,type(None)))],\n"
    "    }\n"
    "    with open(os.path.join(OUTDIR, 'root_meta.json'), 'w', encoding='utf-8') as f:\n"
    "        json.dump(meta, f, ensure_ascii=False, indent=2)\n"
    "\n"
    "    # 6. 模块级核心常量\n"
    "    consts_out = {}\n"
    "    if hasattr(sac, 'CalculationConstant'):\n"
    "        cc = sac.CalculationConstant\n"
    "        cc_items = {}\n"
    "        for a in dir(cc):\n"
    "            if a.startswith('_'): continue\n"
    "            try:\n"
    "                v = getattr(cc, a)\n"
    "                if not callable(v): cc_items[a] = repr(v)\n"
    "            except: pass\n"
    "        consts_out['CalculationConstant'] = cc_items\n"
    "    for cn in ['C_BASE_NUM','C_RATIO','V_ATTACK','V_TOTAL_HURT','V_ATK_INTERVAL','V_ADDITIONAL_DPS_DPH','V_ACTION_TIMES','V_DURATION','V_REPEAT_TIMES','V_ADD_DPS','V_ADD_NUM','V_ADD_RATIO','V_ADD_BASE_NUM']:\n"
    "        if hasattr(sac, cn):\n"
    "            consts_out[cn] = repr(getattr(sac, cn))\n"
    "    with open(os.path.join(OUTDIR, 'module_constants.json'), 'w', encoding='utf-8') as f:\n"
    "        json.dump(consts_out, f, ensure_ascii=False, indent=2)\n"
    "    out.append('CONSTS_KEYS=' + str(list(consts_out.keys())))\n"
    "\n"
    "    out.append('OUTDIR=' + OUTDIR)\n"
    "except Exception:\n"
    "    out.append('TOPERR=' + traceback.format_exc()[:3000])\n"
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
for _ in range(60):
    if done[0]: break
    time.sleep(0.5)

if not res:
    print("TIMEOUT"); sys.exit(1)

# 把原始 JSON 落盘，交给 parse_probe_v1.py 处理
import os
RAW_OUT = r"E:\星际猎人\probe_v1_raw.json"
with open(RAW_OUT, "w", encoding="utf-8") as f:
    f.write(res[0])
print("RAW_WRITTEN=" + RAW_OUT)

# 同步在 stdout 打一份精简摘要（base64 太长，只打头部）
try:
    arr = json.loads(res[0])
    for line in arr:
        if line.startswith("MARSHAL_B64="):
            print("  " + line[:60] + "...(" + str(len(line)) + " chars total)")
        else:
            print("  " + line[:300])
except Exception as e:
    print("parse err:", e)
