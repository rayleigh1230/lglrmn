#!/bin/bash
PYCDC=~/pycdc/build/pycdc
DIR=/mnt/e/星际猎人/dumped/modules_all_translated_v2

files=(
  "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc/get_ship_dps_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc._nested_._add_new_calc/_add_new_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_weapon_ship_dps_calc/get_weapon_ship_dps_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_weapon_dps_dph_calc/get_weapon_dps_dph_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_cur_enhance_add_info/get_cur_enhance_add_info.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_weapon_attack_calc/get_weapon_attack_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_aircraft_dps_calc/get_aircraft_dps_calc.pyc"
  "data.ship_attr_calc.AttrCalcBase.get_module_total_dps_calc/get_module_total_dps_calc.pyc"
)

for f in "${files[@]}"; do
  P="$DIR/$f"
  if [ -f "$P" ]; then
    OUT=$("$PYCDC" "$P" 2>&1)
    CODELINES=$(echo "$OUT" | grep -v "^#" | grep -cve "^\s*$")
    INCOMPLETE=$(echo "$OUT" | grep -ci "incomplete\|unsupported")
    echo "=== $f ==="
    echo "  code lines: $CODELINES  incomplete_flags: $INCOMPLETE"
    if [ "$INCOMPLETE" -gt 0 ]; then
      echo "$OUT" | grep -i "unsupported\|incomplete\|error" | head -3 | sed 's/^/    /'
    fi
  else
    echo "=== NOT FOUND: $f ==="
  fi
done
