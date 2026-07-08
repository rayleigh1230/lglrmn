#!/bin/bash
PYCDAS=~/pycdc/build/pycdas
P="/mnt/e/星际猎人/dumped/modules_all_translated_v2/data.ship_attr_calc.AttrCalcBase.get_weapon_ship_dps_calc/get_weapon_ship_dps_calc.pyc"
echo "=== pycdas output (first 100 lines) ==="
"$PYCDAS" "$P" 2>&1 | head -100
echo ""
echo "=== pycdas output (last 30 lines) ==="
"$PYCDAS" "$P" 2>&1 | tail -30
