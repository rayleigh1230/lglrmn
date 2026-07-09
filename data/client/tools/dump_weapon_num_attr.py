"""Dump cfg_weapon_num_attr 表 + EFFECT 枚举数值。

背景：
  calc_effect_add（反编译已还原）查 cfg_weapon_num_attr.get(effect_id) 决定三通道
  (ratio_add/num_add/base_num_add)。但这张表从未被 dump，导致 TS 的 getEnhanceAdd
  对所有 EID 返回 {0,0,0}——强化加成从未生效。本脚本补全这个缺口。

  同脚本顺带 dump EFFECT 枚举数值（CfgModuleEffectField.Effect.* / effect_def.EffectId.Normal.*），
  反编译里只剩名字无数值（如 EFFECT_SHIP_HP、EFFECT_AIRCRAFT_WEAPON_DURATION_INC 等）。

用法：
  1. 启动游戏 infinite_lagrange_cn.exe（登录进主界面，蓝图系统已加载）
  2. 本脚本需 UAC 提权（或管理员终端）
     python dump_weapon_num_attr.py
  3. 先跑探针模式定位表位置：python dump_weapon_num_attr.py probe
     确认访问路径后再跑正式 dump：python dump_weapon_num_attr.py

产物：
  data/client/config/cfg_weapon_num_attr.json   (EFFECT_ID → 4列)
  data/client/tools/effect_enum_values.json     (枚举名 → 数值)
"""
import frida, time, json, sys, os

MODE = sys.argv[1] if len(sys.argv) > 1 else "dump"  # "probe" or "dump"
OUT_WNA = "data/client/config/cfg_weapon_num_attr.json"
OUT_ENUM = "data/client/tools/effect_enum_values.json"

# ---- 探针模式：先定位 cfg_weapon_num_attr 的访问路径 + 结构 ----
PROBE_CODE = '''
import json, traceback, gc, os, tempfile
out = []
try:
    gc.collect()

    # cfg_weapon_num_attr 在 calc_effect_add 里是全局名，先看它在哪些模块可见。
    # 候选：data_manager.game_data_utils 自身、common.preprocess_data、common.config.configdata
    candidates = [
        "data_manager.game_data_utils",
        "common.preprocess_data",
        "common.config.configdata",
        "configdata",
    ]
    import importlib, sys as _sys
    found_in = None
    tbl_obj = None
    for modname in candidates:
        try:
            m = _sys.modules.get(modname) or importlib.import_module(modname)
        except Exception as e:
            out.append("import fail %s: %s" % (modname, repr(e)[:120]))
            continue
        if hasattr(m, "cfg_weapon_num_attr"):
            found_in = modname
            tbl_obj = getattr(m, "cfg_weapon_num_attr")
            break
    out.append("FOUND_IN=" + str(found_in))

    if tbl_obj is not None:
        out.append("type=" + str(type(tbl_obj)))
        # 试拿一个已知 EID（12060 攻城伤害提高）看结构
        for probe_eid in [12060, 12062, 12020, "12060", "12062"]:
            row = None
            try:
                row = tbl_obj.get(probe_eid)
            except Exception as e:
                out.append("get(%r) err: %s" % (probe_eid, repr(e)[:100]))
            if row is not None:
                out.append("ROW_FOR_%r=" % (probe_eid,) + repr(row)[:400])
                # 列出可用属性
                attrs = [a for a in dir(row) if not a.startswith("_")]
                out.append("ROW_ATTRS=" + json.dumps(attrs, ensure_ascii=False))
                # 试取三列
                for col in ["EFFECT_ATTR_NAME", "TABLE_NAME", "EFFECT_TYPE", "EFFECT_ID"]:
                    try:
                        v = getattr(row, col)
                        out.append("  %s=%r" % (col, v))
                    except Exception as e:
                        out.append("  %s ERR: %s" % (col, repr(e)[:80]))
                break
        # 试 keys（看总数）
        try:
            keys = list(tbl_obj.keys())
            out.append("KEYS_COUNT=%d sample=%s" % (len(keys), keys[:8]))
        except Exception as e:
            out.append("keys() err: %s" % repr(e)[:100])
            # 可能是 list 而非 dict
            try:
                out.append("len=%d is_list=%s" % (len(tbl_obj), isinstance(tbl_obj, (list, tuple))))
            except Exception:
                pass
except Exception:
    out.append("ERR=" + traceback.format_exc()[:2500])
probe_result = json.dumps(out, ensure_ascii=False, default=str)
'''

    # ---- 正式 dump 模式 ----
DUMP_CODE = '''
import json, traceback, gc, os, tempfile
out = []
try:
    gc.collect()
    import sys as _sys
    # 定位表（probe 已确认在 data_manager.game_data_utils.cfg_weapon_num_attr，
    #   真身是 common.config.client_cfg.cfg_weapon_num_attr 模块，行是 tuple (TABLE_NAME, EFFECT_ATTR_NAME, EFFECT_TYPE)）
    tbl_obj = None
    for modname in ["data_manager.game_data_utils", "common.preprocess_data", "common.config.configdata", "configdata"]:
        try:
            m = _sys.modules.get(modname)
            if m is None:
                import importlib
                m = importlib.import_module(modname)
            if hasattr(m, "cfg_weapon_num_attr"):
                tbl_obj = getattr(m, "cfg_weapon_num_attr")
                out.append("table in: " + modname)
                break
        except Exception as e:
            out.append("import fail %s: %s" % (modname, repr(e)[:80]))

    wna = {}
    if tbl_obj is not None:
        # tbl_obj 是一个 module-like 对象，.get(eid) 返回 tuple (TABLE_NAME, EFFECT_ATTR_NAME, EFFECT_TYPE)。
        # 枚举策略：扫可能的 EFFECT_ID 范围（已知 EID 在 1..13000 之间，实测集中在 10/10010-10033/12010-12413 等）。
        # 先看对象有没有直接暴露的 dict（.data / __dict__ / _data）能遍历，避免盲扫。
        enum_items = None
        for attr in ["data", "_data", "all_data", "items", "keys"]:
            try:
                o = getattr(tbl_obj, attr)
                if attr == "items" and callable(o):
                    enum_items = list(o()); out.append("via .items()"); break
                elif attr == "keys" and callable(o):
                    ks = list(o()); enum_items = [(k, tbl_obj.get(k)) for k in ks]; out.append("via .keys()"); break
                elif isinstance(o, dict):
                    enum_items = list(o.items()); out.append("via .%s dict" % attr); break
            except Exception:
                pass

        # tuple 行的列顺序（probe 证实）：(TABLE_NAME, EFFECT_ATTR_NAME, EFFECT_TYPE)
        def row_to_dict(row):
            if isinstance(row, (tuple, list)):
                if len(row) >= 3:
                    return {"TABLE_NAME": row[0], "EFFECT_ATTR_NAME": row[1], "EFFECT_TYPE": row[2]}
                return None
            # 也可能是对象
            d = {}
            for col in ["TABLE_NAME", "EFFECT_ATTR_NAME", "EFFECT_TYPE"]:
                try: d[col] = getattr(row, col)
                except: return None
            return d

        if enum_items is not None:
            for k, row in enum_items:
                d = row_to_dict(row)
                if d: wna[str(k)] = d
            out.append("via enum_items, got %d" % len(wna))
        else:
            # 回退：盲扫已知 EID 范围 + 探针已命中的散点
            out.append("FALLBACK_BLIND_SCAN")
            scan_ids = list(range(1, 13001))
            for eid in scan_ids:
                try:
                    row = tbl_obj.get(eid)
                except Exception:
                    row = None
                if row:
                    d = row_to_dict(row)
                    if d: wna[str(eid)] = d
            out.append("blind scan got %d" % len(wna))

        out.append("WNA_ROWS=%d" % len(wna))
        p = os.path.join(tempfile.gettempdir(), "_wna_result.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(wna, f, ensure_ascii=False)
        out.append("WNA_FILE=" + p)

    # ====== EFFECT 枚举 dump ======
    enum_result = {}
    import importlib
    # CfgModuleEffectField.Effect 在 common.config.table_definition（calc_effect_add 里 import 的）
    for modname in ["common.config.table_definition", "table_definition"]:
        try:
            m = importlib.import_module(modname)
            cmf = getattr(m, "CfgModuleEffectField", None)
            if cmf is not None:
                eff = getattr(cmf, "Effect", None)
                if eff is not None:
                    for name in dir(eff):
                        if name.startswith("EFFECT_"):
                            try:
                                enum_result["CfgModuleEffectField.Effect." + name] = int(getattr(eff, name))
                            except Exception:
                                pass
                out.append("CfgModuleEffectField.Effect: %d members" % sum(1 for k in enum_result if k.startswith("CfgModuleEffectField")))
                break
        except Exception as e:
            out.append("enum import fail %s: %s" % (modname, repr(e)[:80]))
    # effect_def.EffectId.Normal
    for modname in ["common.config.effect_def", "effect_def", "common.common_definition"]:
        try:
            m = importlib.import_module(modname)
            ed = getattr(m, "effect_def", None) or m
            eid_obj = getattr(ed, "EffectId", None)
            if eid_obj is not None:
                normal = getattr(eid_obj, "Normal", None)
                if normal is not None:
                    for name in dir(normal):
                        if name.startswith("EFFECT_"):
                            try:
                                enum_result["effect_def.EffectId.Normal." + name] = int(getattr(normal, name))
                            except Exception:
                                pass
                out.append("effect_def.EffectId.Normal: %d members" % sum(1 for k in enum_result if k.startswith("effect_def")))
                break
        except Exception as e:
            out.append("effect_def import fail %s: %s" % (modname, repr(e)[:80]))
    # 写临时文件
    p2 = os.path.join(tempfile.gettempdir(), "_enum_result.json")
    with open(p2, "w", encoding="utf-8") as f:
        json.dump(enum_result, f, ensure_ascii=False, indent=2)
    out.append("ENUM_FILE=" + p2)
    out.append("ENUM_COUNT=%d" % len(enum_result))
    # 校验锚点（12060/12062 已知）
    for chk in ["CfgModuleEffectField.Effect.EFFECT_DESTROY_INC", "CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_INC"]:
        out.append("CHECK %s = %s" % (chk, enum_result.get(chk, "MISSING")))
except Exception:
    out.append("ERR=" + traceback.format_exc()[:2500])
probe_result = json.dumps(out, ensure_ascii=False, default=str)
'''


def run_probe(code_str):
    JS = r"""
    var log=[];
    try {
      var py=Process.getModuleByName("python311.dll");
      var f=function(n){return py.getExportByName(n);};
      var Ens=new NativeFunction(f("PyGILState_Ensure"),'pointer',[]);
      var Rel=new NativeFunction(f("PyGILState_Release"),'void',['pointer']);
      var Run=new NativeFunction(f("PyRun_SimpleString"),'int',['pointer']);
      var AddM=new NativeFunction(f("PyImport_AddModule"),'pointer',['pointer']);
      var GetA=new NativeFunction(f("PyObject_GetAttrString"),'pointer',['pointer','pointer']);
      var Str=new NativeFunction(f("PyObject_Str"),'pointer',['pointer']);
      var UTF8=new NativeFunction(f("PyUnicode_AsUTF8"),'pointer',['pointer']);
      var codeStr = CODE_PLACEHOLDER;
      var pyCode = [
        "import importlib.util, sys, os, tempfile",
        "code = " + JSON.stringify(codeStr),
        "tmpf = os.path.join(tempfile.gettempdir(), '_wna_mod.py')",
        "with open(tmpf, 'w', encoding='utf-8') as f: f.write(code)",
        "spec = importlib.util.spec_from_file_location('_wna_mod', tmpf)",
        "mod = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(mod)",
      ].join("\n");
      var c=Memory.allocUtf8String(pyCode);
      var g=Ens(); var rc=Run(c);
      log.push("rc="+rc);
      if(rc==0){
        var m=AddM(Memory.allocUtf8String("__main__"));
        var v=GetA(m, Memory.allocUtf8String("mod"));
        if(!v.isNull()){
          var v2=GetA(v, Memory.allocUtf8String("probe_result"));
          if(!v2.isNull()){var s=Str(v2);var u=UTF8(s);if(!u.isNull())log.push("RESULT="+u.readUtf8String());}
        }
      }
      Rel(g);
    } catch(e){log.push("JSERR="+e);}
    send(JSON.stringify(log));
    """.replace("CODE_PLACEHOLDER", json.dumps(code_str))

    done = [False]; res = []
    def on_msg(m, d):
        if m["type"] == "send": res.append(m["payload"]); done[0] = True
        elif m["type"] == "error": res.append("ERR:" + m.get("description", "")); done[0] = True
    ps = [p for p in frida.get_local_device().enumerate_processes() if "lagrange" in p.name.lower()]
    if not ps:
        print("NO_GAME: 未找到 infinite_lagrange_cn.exe 进程，请先启动游戏并登录进主界面")
        sys.exit(1)
    print("attach pid=%d name=%s" % (ps[0].pid, ps[0].name))
    s = frida.attach(ps[0].pid).create_script(JS)
    s.on("message", on_msg); s.load()
    for _ in range(600):
        if done[0]: break
        time.sleep(0.5)
    if not res:
        print("TIMEOUT"); sys.exit(1)
    return res[0]


def main():
    code = PROBE_CODE if MODE == "probe" else DUMP_CODE
    raw = run_probe(code)
    try:
        payload = json.loads(raw)
    except Exception:
        print("无法解析返回：", raw[:600]); sys.exit(1)

    wna_file = None
    enum_file = None
    for line in payload:
        if isinstance(line, str):
            if line.startswith("RESULT="):
                inner = json.loads(line[7:])
                for il in inner:
                    if isinstance(il, str):
                        if il.startswith("WNA_FILE="): wna_file = il[len("WNA_FILE="):]
                        elif il.startswith("ENUM_FILE="): enum_file = il[len("ENUM_FILE="):]
                        else: print(il)
            else:
                print(line)

    if MODE == "probe":
        print("\n[probe 模式完成] 看上面输出确认表位置和结构后，跑 python dump_weapon_num_attr.py 正式 dump")
        return

    # 正式 dump：拷贝临时文件到目标位置
    if wna_file and os.path.exists(wna_file):
        os.makedirs(os.path.dirname(OUT_WNA), exist_ok=True)
        with open(wna_file, "r", encoding="utf-8") as rf:
            data = json.load(rf)
        with open(OUT_WNA, "w", encoding="utf-8") as fout:
            json.dump(data, fout, ensure_ascii=False, indent=2)
        print("\n★ 已写入 %s (%d 行)" % (OUT_WNA, len(data)))
        # 校验三通道类型
        from collections import Counter
        c = Counter(v.get("EFFECT_TYPE") for v in data.values())
        print("  EFFECT_TYPE 分布:", dict(c))
        # 抽样
        for eid in ["12060", "12062", "12020"]:
            if eid in data:
                print("  %s: %s" % (eid, data[eid]))
    else:
        print("⚠ 未拿到 weaponNumAttr 结果（表未定位？先跑 probe 模式）")

    if enum_file and os.path.exists(enum_file):
        os.makedirs(os.path.dirname(OUT_ENUM), exist_ok=True)
        with open(enum_file, "r", encoding="utf-8") as rf:
            edata = json.load(rf)
        with open(OUT_ENUM, "w", encoding="utf-8") as fout:
            json.dump(edata, fout, ensure_ascii=False, indent=2)
        print("\n★ 已写入 %s (%d 个枚举值)" % (OUT_ENUM, len(edata)))
        for name in ["CfgModuleEffectField.Effect.EFFECT_SHIP_HP",
                     "CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_DURATION_INC",
                     "CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_CD_TIME_INC",
                     "CfgModuleEffectField.Effect.EFFECT_AIRCRAFT_WEAPON_ATTKACK_ADD"]:
            print("  %s = %s" % (name, edata.get(name, "MISSING")))
    else:
        print("⚠ 未拿到枚举结果")


if __name__ == "__main__":
    main()
