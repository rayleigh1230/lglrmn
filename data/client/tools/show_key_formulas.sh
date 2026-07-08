#!/bin/bash
PYCDC=~/pycdc/build/pycdc
DIR=/mnt/e/星际猎人/dumped/modules_all_translated_v2

for name in \
  "data.ship_attr_calc.AfterSystemEffectCalculator.expression/expression.pyc" \
  "data.ship_attr_calc.DPSCalculator.expression/expression.pyc" \
  "data.ship_attr_calc.EnhanceCalculator.expression/expression.pyc" \
  "data.ship_attr_calc.DPSCalculator.__init__/DPSCalculator.__init__.pyc"
do
    P="$DIR/$name"
    D=$(dirname "$name")
    echo "=== $D ==="
    if [ -f "$P" ]; then
        "$PYCDC" "$P" 2>&1 | head -25
    else
        echo "  NOT FOUND"
    fi
    echo ""
done

# 列出 DPSCalculator 相关全部方法
echo "=== all DPSCalculator/EnhanceCalculator methods ==="
ls -d "$DIR"/data.ship_attr_calc.DPSCalculator.* "$DIR"/data.ship_attr_calc.EnhanceCalculator.* 2>/dev/null | sed "s|$DIR/||"
