
import sys, types, os, traceback

OUT_DIR = r"E:\星际猎人\dumped"
os.makedirs(OUT_DIR, exist_ok=True)

def safe_repr(v, maxlen=200):
    try:
        return repr(v)[:maxlen]
    except:
        return "<unreprable>"

def dump_code(co, ind=""):
    L = []
    try:
        L.append(ind + "args: " + str(list(co.co_varnames[:co.co_argcount])))
        if co.co_names:
            L.append(ind + "names: " + str(list(co.co_names)))
        consts = []
        for c in co.co_consts:
            if hasattr(c, "co_code"):
                consts.append("<code:" + c.co_name + ">")
            else:
                consts.append(safe_repr(c, 100))
        if consts:
            L.append(ind + "consts: " + str(consts))
        for nc in [c for c in co.co_consts if hasattr(c, "co_code")]:
            L.append(ind + "  [nested] " + nc.co_name + ":")
            L.extend(dump_code(nc, ind + "    "))
    except Exception as e:
        L.append(ind + "<err: " + str(e) + ">")
    return L

def dump_class(cls, L, depth=0):
    ind = "  " * depth
    try:
        bases = [getattr(b, "__name__", str(b)) for b in getattr(cls, "__bases__", [])]
        L.append(ind + "class " + cls.__name__ + "(" + ",".join(bases) + "):")
        try:
            items = list(vars(cls).items())
        except:
            items = []
        for k, v in items:
            if k.startswith("__") and k not in ("__init__", "__new__"):
                continue
            if isinstance(v, types.FunctionType):
                L.append(ind + "  def " + k + "(...):")
                L.extend(dump_code(v.__code__, ind + "    "))
            elif isinstance(v, property):
                L.append(ind + "  " + k + " = property")
            else:
                L.append(ind + "  " + k + " = " + safe_repr(v, 120))
    except Exception as e:
        L.append(ind + "<class err: " + str(e) + ">")

def dump_module(modname, L):
    import importlib
    if modname not in sys.modules:
        try:
            importlib.import_module(modname)
        except Exception as e:
            L.append("# import " + modname + " FAILED: " + str(e)[:100])
            return
    mod = sys.modules[modname]
    L.append("# ====== " + modname + " ======")
    L.append("# file: " + str(getattr(mod, "__file__", "?")))
    try:
        items = list(vars(mod).items())
    except:
        items = []
    for k, v in items:
        if k.startswith("__"):
            continue
        if isinstance(v, type):
            dump_class(v, L, 1)
        elif isinstance(v, types.FunctionType):
            L.append("  def " + k + "(...):")
            L.extend(dump_code(v.__code__, "    "))
        elif isinstance(v, types.ModuleType):
            L.append("  " + k + " = <module " + v.__name__ + ">")
        else:
            L.append("  " + k + " = " + safe_repr(v, 150))

GROUPS = {
    "01_battle_command.txt": [
        "scene_zoom0.battle_command.battle_command",
        "scene_zoom0.battle_command.battle_command_factory",
        "scene_zoom0.battle_command.weapon_attack_round_command",
        "scene_zoom0.battle_command.ship_skill_command",
        "scene_zoom0.battle_command.ship_repair_command",
        "scene_zoom0.battle_command.eva_boss_damage_command",
        "scene_zoom0.battle_command.aircraft_formation_command",
    ],
    "02_battle_entity.txt": [
        "scene_zoom0.battle_entity",
        "scene_zoom0.battle_ship_group.battle_ship_group_data",
        "data.battle.client_battle_data",
        "data.battle_ship_group.battle_ship_group_data",
    ],
    "03_ship_attribute.txt": [
        "data.ship.ship_attribute",
        "data.ship.ship_battle_attribute",
        "data.ship.ship_data",
        "data.ship.client_battle_ship_data",
    ],
    "04_weapon.txt": [
        "scene_zoom0.weapon.bullet_manager",
        "scene_zoom0.weapon.link_ctrl_comp",
    ],
    "05_buff_effect.txt": [
        "scene_zoom0.buff_effect",
        "scene_zoom0.buff_effect.buff_effect_base",
    ],
}

summary = []
for fname, mods in GROUPS.items():
    L = ["# dumped from game runtime", ""]
    for mn in mods:
        try:
            dump_module(mn, L)
            L.append("")
        except Exception as e:
            L.append("# ERROR " + mn + ": " + str(e))
    with open(os.path.join(OUT_DIR, fname), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    summary.append(fname + ": " + str(len(L)) + " lines")

with open(os.path.join(OUT_DIR, "_summary.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(summary))
_PROBE_OUT = "DONE: " + str(len(summary)) + " files, " + "; ".join(summary)

# 上面是dump逻辑(已写入). 这里确保_PROBE_OUT被设置
try:
    _PROBE_OUT
except NameError:
    _PROBE_OUT = "DUMP_LOGIC_COMPLETED"
