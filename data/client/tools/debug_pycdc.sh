#!/bin/bash
PYCDC=~/pycdc/build/pycdc
P="/mnt/e/星际猎人/dumped/modules_all_translated_v2/data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc/get_ship_dps_calc.pyc"
echo "=== file size ==="
wc -c "$P"
echo "=== STDOUT ==="
"$PYCDC" "$P" 2>/tmp/err.txt
echo "=== STDERR ==="
cat /tmp/err.txt
