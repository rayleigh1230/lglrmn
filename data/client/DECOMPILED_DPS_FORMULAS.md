# 反编译出的客户端核心公式

来源：从 infinite_lagrange_cn.exe (Python 3.11) 反编译，三层反逆向破解后取得。
反编译方法见 `data/client/tools/translate_recursive_v2.py` + `patch_pycdc.py`。

## 1. AttackCalculator.expression（基础攻击力公式）

```python
c_percent_100 = _C(100)
return (_V(C_RATIO) / c_percent_100) * (
    (_V(C_BASE_NUM) + _V(V_ADD_BASE_NUM) + _V(V_SKILL_EFFECT))
    * (c_percent_100 + _V(V_ADD_RATIO) + _V(V_SKILL_EFFECT_RATIO))
    / c_percent_100
    + _V(V_ADD_NUM)
)
```

变量说明（来自 get_weapon_attack_calc 反编译）：
- `C_RATIO` = ratio：基础百分比系数
  - MA_MODULE_DPS: 100
  - MA_MODULE_AIR_DPS: config[AIRCRAFT_COEF]
  - MA_MODULE_COEF_DPS: config[DESTROY_COEF]
- `C_BASE_NUM` = base_num：武器动作基础值 `get_weapon_action_base_value(weapon_action_id, 'Tb_cfg_weapon_action.ACTION_PARAM')`
- `V_ADD_BASE_NUM`：强化提供的额外基础值
- `V_SKILL_EFFECT`：技能效果加成（基础值）
- `V_ADD_RATIO`：强化提供的额外百分比
- `V_SKILL_EFFECT_RATIO`：技能效果加成（百分比）
- `V_ADD_NUM`：强化提供的固定数值

`_C(x)` = 常量，`_V(x)` = 变量引用。

## 2. AfterSystemEffectCalculator.expression（系统效果后的公式）

```python
c_percent_100 = _C(100)
return (_V(C_BASE_NUM) + _V(V_ADD_BASE_NUM))
    * (c_percent_100 + _V(V_ADD_RATIO) + _V(V_SKILL_EFFECT_RATIO))
    / c_percent_100
    + _V(V_ADD_NUM)
```

比 AttackCalculator 少了 `C_RATIO` 倍率和 `V_SKILL_EFFECT` 项。

## 3. get_ship_dps_calc（舰船 DPS 顶层调度）

```python
calc = get_null_calculator()

def _add_new_calc(new_calc=None):
    add_exp = new_calc.get_expression()
    add_exp = add_exp.to_int(add_exp)
    new_exp = calc.get_expression() + add_exp
    calc.make_merge(new_calc, new_exp)

for module_info in self.cur_modules:
    module_id = module_info[0]
    slot_id = module_info[1]
    if dps_type == common_definition.MA_SHIP_DPS:
        _add_new_calc(self.get_weapon_ship_dps_calc(slot_id, module_id))
        continue
    if dps_type == common_definition.MA_SHIP_AIR_DPS:
        _add_new_calc(self.get_weapon_air_defend_dps_calc(slot_id, module_id))
        continue
    if dps_type == common_definition.MA_SHIP_DESTROY_COEF_DPS:
        _add_new_calc(self.get_weapon_destroy_coef_dps_calc(slot_id, module_id))
        continue
    if dps_type == common_definition.MA_REPAIR:
        _add_new_calc(self.get_module_repair_calc(slot_id, module_id))
        continue
    if dps_type == common_definition.MA_SHIP_OPERATION:
        _add_new_calc(self.get_module_opeation_calc(slot_id, module_id))
    aircraft_group_num = Tb_cfg_ship.get(self.ship_id)[Tb_cfg_ship.AIRCRAFT_GROUP_NUM]
    calc.cur_expression = calc.get_expression() * _C(aircraft_group_num)
    _add_new_calc(self.get_aircraft_dps_calc(dps_type, self.all_effects_list, self.cur_enhance_dic))
return calc
```

## 4. get_weapon_ship_dps_calc（武器对舰 DPS）

```python
if module_id not in client_configdata.weapon_priority_target_ship:
    return get_null_calculator()
calc = None.get_weapon_dps_dph_calc(slot_id, module_id, common_definition.MA_MODULE_DPS)
additional_info = self.get_weapon_additional_dps_dph_info(slot_id, module_id, common_definition.MA_MODULE_DPS)
if additional_info:
    exp = _V(V_ADDITIONAL_DPS_DPH)
    calc.cur_expression = calc.get_expression() + exp
    calc.collect_expression()
    self.calculator_bind_named_diffs(calc, V_ADDITIONAL_DPS_DPH, additional_info)
return calc
```

## 5. get_weapon_attack_calc（武器攻击力构造）

```python
skill_effect_ratio = game_data_utils.get_module_effect_ori_value_info(module_id, CfgModuleEffectField.Effect.EFFECT_DAMAGE_INC)
skill_effect_base_info = []
invalid_effect_list = []
ratio = 100
config = Tb_cfg_weapon.get(module_id)
if dps_type == common_definition.MA_MODULE_DPS:
    invalid_effect_list = [EFFECT_AIRCRAFT_INC, EFFECT_DESTROY_INC]
    invalid_effect_list += ALL_ANIT_AIR_EFFECT_ID
elif dps_type == common_definition.MA_MODULE_AIR_DPS:
    invalid_effect_list = [EFFECT_DESTROY_INC]
    skill_effect_ratio += get_module_effect_ori_value_info(module_id, EFFECT_AIRCRAFT_INC)
    ratio = config[AIRCRAFT_COEF]
    skill_effect_base_info = self.get_skill_effect_ratio_info(module_id, ALL_ANIT_AIR_EFFECT_ID)
elif dps_type == common_definition.MA_MODULE_COEF_DPS:
    invalid_effect_list = [EFFECT_AIRCRAFT_INC]
    invalid_effect_list += ALL_ANIT_AIR_EFFECT_ID
    skill_effect_ratio += get_module_effect_ori_value_info(module_id, EFFECT_DESTROY_INC)
    ratio = config[DESTROY_COEF]

attr_type = 'Tb_cfg_weapon_action.ACTION_PARAM'
base_num = self.get_weapon_action_base_value(weapon_action_id, attr_type)
effect_add_infos = self.get_cur_enhance_add_info(slot_id, attr_type, weapon_action_id=weapon_action_id, invalid_effect_list=invalid_effect_list)

atk_calculator = AttackCalculator()
calculator_bind_three_basic_info(atk_calculator, effect_add_infos)
atk_calculator.bind_values(ConstantData, 'ratio', ratio, C_RATIO)
atk_calculator.bind_values(ConstantData, 'base_num', base_num, C_BASE_NUM)
for skill_effect_base in skill_effect_base_info:
    atk_calculator.bind_values(ConstantData, skill_effect_base.enhance_name, skill_effect_base.value, V_SKILL_EFFECT)
for _skill_effect_ratio in skill_effect_ratio:
    atk_calculator.bind_values(DiffData, _skill_effect_ratio.enhance_name, _skill_effect_ratio.value, V_SKILL_EFFECT_RATIO)
return atk_calculator
```

## 6. get_aircraft_dps_calc（飞机/无人机 DPS）

```python
calc = DPSCalculator(_C(0))
for effect_info in all_effects_list:
    _system_id = effect_info.system_id
    effect_config = effect_info.effect_record
    effect_id = effect_config[Tb_cfg_system_effect.EFFECT_ID]
    if effect_id in common_definition.DRONE_EFFECT_IDS:
        value = effect_config[Tb_cfg_module_effect.EFFECT_PARAM]
        ship_id = value / 100
        num = value % 100
        bp_attr_calc_obj = BlueprintAttrCalc()
        bp_attr_calc_obj.prepare_by_ship_id(ship_id)
        filtered_enhance_dic = cls._filter_drone_enhance(cur_enhance_dic)
        bp_attr_calc_obj.set_mother_ship_info(_system_id, filtered_enhance_dic)
        newcalc = bp_attr_calc_obj.get_ship_dps_calc(dps_type)
        calc.make_merge(newcalc, calc.get_expression() + newcalc.get_expression() * _C(num))
return calc
```

## 7. get_cur_enhance_add_info（强化效果聚合）

```python
if invalid_effect_list:
    invalid_effect_list = []
if not system_id:
    system_id = slot_id / CfgShipField.Prefix.PREFIX_SYSTEM_ID_TO_SLOT
ret = dict()
for effect_info in self.all_effects_list:
    effect_config = effect_info.effect_record
    effect_id = effect_config[Tb_cfg_system_effect.EFFECT_ID]
    if valid_effect_list and effect_id not in valid_effect_list:
        continue
    if effect_id in invalid_effect_list:
        continue
    _system_id = effect_info.system_id
    if not game_data_utils.is_valid_effect(system_id, slot_id, _system_id, effect_config, weapon_action_id=weapon_action_id):
        continue
    effect_add = game_data_utils.calc_effect_add(effect_info, attr_type)
    if not effect_add.check_enhance_valid():
        continue
    if effect_add.enhance_name in ret:
        print('warning: duplicate enhance name: {}'.format(effect_add.enhance_name))
        ret[effect_add.enhance_name].add_other(effect_add)
        continue
    ret[effect_add.enhance_name] = effect_add
return ret
```

## 8. get_module_total_dps_calc（模块总 DPS 聚合）

```python
aircraft_dps_calc = self.get_aircraft_dps_calc_by_module_id(slot_id, module_id, dps_type)
calc = None
if dps_type == common_definition.MA_SHIP_DPS:
    calc = self.get_weapon_ship_dps_calc(slot_id, module_id)
elif dps_type == common_definition.MA_SHIP_AIR_DPS:
    calc = self.get_weapon_air_defend_dps_calc(slot_id, module_id)
elif dps_type == common_definition.MA_SHIP_DESTROY_COEF_DPS:
    calc = self.get_weapon_destroy_coef_dps_calc(slot_id, module_id)
elif dps_type == common_definition.MA_REPAIR:
    calc = self.get_module_repair_calc(slot_id, module_id)
elif dps_type == common_definition.MA_SHIP_OPERATION:
    calc = self.get_module_opeation_calc(slot_id, module_id)
if calc:
    new_exp = calc.get_expression() + aircraft_dps_calc.get_expression()
    calc.make_merge(aircraft_dps_calc, new_exp)
else:
    calc = aircraft_dps_calc
return calc
```

## 关键常量与变量编码

- `_C(x)` / `bind_values(ConstantData, ...)` = 常量
- `_V(x)` / `bind_values(DiffData, ...)` = 可变差值
- `C_RATIO`：百分比系数（100/飞机系数/摧毁系数）
- `C_BASE_NUM`：武器动作基础攻击
- `C_PERCENT_100` = 100（常数）
- `V_ADD_BASE_NUM`：强化加成（基础值部分）
- `V_ADD_RATIO`：强化加成（百分比部分）
- `V_ADD_NUM`：强化加成（固定值部分）
- `V_SKILL_EFFECT`：技能效果（基础值）
- `V_SKILL_EFFECT_RATIO`：技能效果（百分比）
- `V_ADDITIONAL_DPS_DPH`：额外 DPS/DPH（来自 additional_info）

## 攻击力展开公式（最终形式）

```
attack = (ratio / 100) * ((base_num + add_base_num + skill_effect) * (100 + add_ratio + skill_effect_ratio) / 100 + add_num)
```

其中：
- `ratio` = 100（普通）/ AIRCRAFT_COEF（防空）/ DESTROY_COEF（摧毁）
- `base_num` = weapon_action.ACTION_PARAM（配置表基础值）
- `add_base_num/add_ratio/add_num` = 强化提供的加成
- `skill_effect/skill_effect_ratio` = 技能加成
