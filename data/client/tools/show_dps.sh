#!/bin/bash
PYCDC=~/pycdc/build/pycdc
DIR=/mnt/e/星际猎人/dumped/modules_all_translated_v2

for f in \
  "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc/get_ship_dps_calc.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc._nested_._add_new_calc/_add_new_calc.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_weapon_ship_dps_calc/get_weapon_ship_dps_calc.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_weapon_attack_calc/get_weapon_attack_calc.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_aircraft_dps_calc/get_aircraft_dps_calc.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_cur_enhance_add_info/get_cur_enhance_add_info.pyc" \
  "data.ship_attr_calc.AttrCalcBase.get_module_total_dps_calc/get_module_total_dps_calc.pyc"
do
  P="$DIR/$f"
  echo "=============================================="
  echo "=== $f ==="
  echo "=============================================="
  if [ -f "$P" ]; then
    "$PYCDC" "$P" 2>&1
  else
    echo "NOT FOUND: $P"
  fi
  echo ""
done
