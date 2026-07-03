"""
阶段0.2b: 批量提取图标 PNG (强化图标 + 模块效果图标 + 舰船能力图标)

已确认的提取链:
  nxio3.load_file('res:/<path>') → bytes (解密+解压后的PNG)
  路径来源:
    - 强化图标: blueprint_utils.get_ship_system_effect_icon(PREFIX)
    - 模块效果: cfg_module_effect.ICON_PATH (全路径)
    - 舰船能力: ui_res.SHIP_ABILITY_ICON (icon_ship_attribute/) 等

策略: 在游戏解释器内, 收集所有路径 → load_file → 写盘到 data/client/icons/
保留 _probe_out 契约返回统计结果。
"""
import frida, time, json, os

OUT_DIR = r"F:\战斗模拟器\lglrmn\data\client\icons"

# OUT_DIR 注入: 转成正斜杠避免转义地狱, 用占位符末尾替换
OUT_DIR_FORWARD = OUT_DIR.replace('\\', '/')

JS_TEMPLATE = r"""
var log = [];
try {
    var pyMod = Process.getModuleByName("python311.dll");
    function exp(mod, name) { return mod.getExportByName(name); }
    var PyGILState_Ensure = new NativeFunction(exp(pyMod,"PyGILState_Ensure"),'pointer',[]);
    var PyGILState_Release = new NativeFunction(exp(pyMod,"PyGILState_Release"),'void',['pointer']);
    var PyRun_SimpleString = new NativeFunction(exp(pyMod,"PyRun_SimpleString"),'int',['pointer']);
    var PyImport_AddModule = new NativeFunction(exp(pyMod,"PyImport_AddModule"),'pointer',['pointer']);
    var PyObject_GetAttrString = new NativeFunction(exp(pyMod,"PyObject_GetAttrString"),'pointer',['pointer','pointer']);
    var PyObject_Str = new NativeFunction(exp(pyMod,"PyObject_Str"),'pointer',['pointer']);
    var PyUnicode_AsUTF8 = new NativeFunction(exp(pyMod,"PyUnicode_AsUTF8"),'pointer',['pointer']);

    var pyCode = [
        "import sys, traceback, json, os",
        "out = []",
        "OUT_DIR = '__OUT_DIR_FORWARD__'",
        "try:",
        "    import nxio3",
        "    if not os.path.exists(OUT_DIR): os.makedirs(OUT_DIR)",
        "    stats = {'saved': 0, 'missing': 0, 'errors': 0, 'paths': []}",
        "    saved_files = []",
        "    missing_paths = []",
        "    error_paths = []",
        "    def save_icon(rel_path, save_name=None):",
        "        '''读res:/<rel_path>并写到OUT_DIR/<save_name or basename>'''",
        "        full = 'res:/' + rel_path.lstrip('/')",
        "        try:",
        "            if not nxio3.exists(full):",
        "                stats['missing']+=1; missing_paths.append(rel_path); return False",
        "            data = nxio3.load_file(full)",
        "            if not data:",
        "                stats['missing']+=1; missing_paths.append(rel_path+'(empty)'); return False",
        "            fn = save_name or os.path.basename(rel_path)",
        "            dst = os.path.join(OUT_DIR, fn)",
        "            with open(dst,'wb') as f: f.write(data)",
        "            stats['saved']+=1; saved_files.append(fn); return True",
        "        except Exception as e:",
        "            stats['errors']+=1; error_paths.append(rel_path+':'+str(e)[:60]); return False",
        "    # ====== 1. 强化图标 (get_ship_system_effect_icon) ======",
        "    try:",
        "        from ui.bp_ship_view_facade import blueprint_utils",
        "        from common.config.client_cfg import cfg_ship_attr",
        "        # 收集所有 SYSTEM_EFFECT_PREFIX",
        "        # 从 cfg_system_enhance 配置表读 (客户端可能用 Tb_cfg_ship_system)",
        "        prefixes = set()",
        "        # 方式A: 直接遍历 enhance 配置",
        "        try:",
        "            from common.config.db.Tb_cfg_ship_system import Tb_cfg_ship_system",
        "            data = Tb_cfg_ship_system.get_all_data() if hasattr(Tb_cfg_ship_system,'get_all_data') else {}",
        "            for k,rec in (data.items() if hasattr(data,'items') else []):",
        "                # SYSTEM_EFFECT_PREFIX 字段",
        "                pass",
        "        except Exception: pass",
        "        # 方式B: 用预定义的PREFIX范围 (cfg_system_enhance 的 SYSTEM_EFFECT_PREFIX)",
        "        # 实测 PREFIX 是3-4位数, 范围约 100-4000, 直接遍历",
        "        out.append('扫描 SYSTEM_EFFECT_PREFIX 范围 100-4000...')",
        "        valid_prefixes = []",
        "        for pfx in range(100, 4001):",
        "            try:",
        "                path = blueprint_utils.get_ship_system_effect_icon(pfx)",
        "                if path and isinstance(path, str) and 'icon_system_intensify' in path:",
        "                    if pfx not in prefixes:",
        "                        prefixes.add(pfx); valid_prefixes.append((pfx, path))",
        "            except Exception: pass",
        "        out.append('发现 '+str(len(valid_prefixes))+' 个有效 PREFIX')",
        "        # 去重按 path (多个PREFIX可能映射同一图标)",
        "        seen_paths = set()",
        "        for pfx, path in valid_prefixes:",
        "            if path not in seen_paths:",
        "                seen_paths.add(path)",
        "                save_icon(path)",
        "        out.append('强化图标去重后 '+str(len(seen_paths))+' 个唯一路径')",
        "    except Exception as e: out.append('intensify ERR: '+repr(str(e))[:150])",
        "    # ====== 2. 模块效果图标 (cfg_module_effect ICON_PATH) ======",
        "    try:",
        "        from common.config.db.Tb_cfg_module_effect import Tb_cfg_module_effect",
        "        data = Tb_cfg_module_effect.get_all_data() if hasattr(Tb_cfg_module_effect,'get_all_data') else {}",
        "        cnt=0",
        "        for k,rec in (data.items() if hasattr(data,'items') else []):",
        "            try:",
        "                # ICON_PATH 字段 (尝试常见字段名)",
        "                icon_path=None",
        "                for fld in ['ICON_PATH','icon_path','PATH','ICON']:",
        "                    if hasattr(Tb_cfg_module_effect, fld):",
        "                        idx=getattr(Tb_cfg_module_effect, fld)",
        "                        icon_path = rec[idx] if hasattr(rec,'__getitem__') else None",
        "                        if icon_path: break",
        "                if icon_path and isinstance(icon_path,str) and icon_path.endswith('.png'):",
        "                    save_icon(icon_path)",
        "                    cnt+=1",
        "            except Exception: pass",
        "        out.append('模块效果图标: 处理 '+str(cnt))",
        "    except Exception as e: out.append('module_effect ERR: '+repr(str(e))[:120])",
        "    # ====== 3. 舰船能力/属性图标 ======",
        "    try:",
        "        from common import icon_utils",
        "        ur = icon_utils.ui_res",
        "        # SHIP_ABILITY_ICON 系列",
        "        for const in ['SHIP_ABILITY_ICON','SHIP_ABILITY_ICON_LARGE']:",
        "            v=getattr(ur,const,None)",
        "            if isinstance(v,(list,tuple)):",
        "                for p in v:",
        "                    if isinstance(p,str) and p.endswith('.png'): save_icon(p)",
        "            elif isinstance(v,dict):",
        "                for p in v.values():",
        "                    if isinstance(p,str) and p.endswith('.png'): save_icon(p)",
        "        # icon_ship_attribute 目录常用图标 (从BATTLE_REPORT常量提取)",
        "        for attr in dir(ur):",
        "            if 'SHIP_ATTRIBUTE' in attr or 'SHIP_ABILITY' in attr or 'FIREPOWER' in attr or 'ANTIAIRCRAFT' in attr:",
        "                v=getattr(ur,attr)",
        "                if isinstance(v,str) and v.endswith('.png'): save_icon(v)",
        "                elif isinstance(v,(list,tuple)):",
        "                    for p in v:",
        "                        if isinstance(p,str) and p.endswith('.png'): save_icon(p)",
        "    except Exception as e: out.append('ability_icon ERR: '+repr(str(e))[:120])",
        "    # ====== 4. 通用舰种图标 (icon_ship_big/small等) ======",
        "    generic_ship_icons = [",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_big.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_small.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_medium_sized.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_airplane.png',",
        "        'cocosui/_resource/icon/ship_system_effect/icon_ship_matching.png',",
        "        'cocosui/_resource/icon/icon_production_shiptype_super.png',",
        "        'cocosui/_resource/icon/icon_production_shiptype_mainship.png',",
        "        'cocosui/_resource/icon/icon_production_shiptype_engineering.png',",
        "        'cocosui/_resource/icon/icon_production_shiptype_carrier.png',",
        "        'cocosui/_resource/icon/icon_flagship.png',",
        "    ]",
        "    for p in generic_ship_icons: save_icon(p)",
        "    # ====== 汇总 ======",
        "    out.append('===== 提取统计 =====')",
        "    out.append('saved='+str(stats['saved']))",
        "    out.append('missing='+str(stats['missing']))",
        "    out.append('errors='+str(stats['errors']))",
        "    if missing_paths: out.append('missing sample='+str(missing_paths[:10]))",
        "    if error_paths: out.append('errors sample='+str(error_paths[:5]))",
        "    # 写文件清单供manifest生成",
        "    manifest_path = os.path.join(OUT_DIR, '_extracted_files.json')",
        "    with open(manifest_path,'w',encoding='utf-8') as f:",
        "        json.dump({'saved':sorted(set(saved_files)),'missing':missing_paths[:200]},f,ensure_ascii=False)",
        "except Exception:",
        "    out.append('TOPERR='+traceback.format_exc())",
        "_probe_out = json.dumps(out)"
    ].join("\n");

    var code = Memory.allocUtf8String(pyCode);
    var gil = PyGILState_Ensure();
    var rc = PyRun_SimpleString(code);
    log.push("rc=" + rc);
    if (rc == 0) {
        var mod = PyImport_AddModule(Memory.allocUtf8String("__main__"));
        if (!mod.isNull()) {
            var v = PyObject_GetAttrString(mod, Memory.allocUtf8String("_probe_out"));
            if (!v.isNull()) {
                var st = PyObject_Str(v);
                var cs = PyUnicode_AsUTF8(st);
                if (!cs.isNull()) log.push("PYRESULT=" + cs.readUtf8String());
            }
        }
    }
    PyGILState_Release(gil);
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
        res.append("JSERR:" + m.get("description", "")); done[0] = True

pid = [p.pid for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
if not pid: print("NO_GAME"); exit()
print("attach", pid[0], "...")
os.makedirs(OUT_DIR, exist_ok=True)
JS = JS_TEMPLATE.replace('__OUT_DIR_FORWARD__', OUT_DIR_FORWARD)
s = frida.attach(pid[0]).create_script(JS)
s.on('message', on_msg); s.load()
# 批量提取耗时较长, 给足时间
for _ in range(400):
    if done[0]: break
    time.sleep(0.3)
if res:
    for line in json.loads(res[0]):
        print("  " + line)
else:
    print("NO RESPONSE (超时?)")
