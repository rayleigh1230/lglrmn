#!/bin/bash
PYCDC=~/pycdc/build/pycdc
DIR=/mnt/e/星际猎人/dumped/modules_all_translated_v2

echo "=== data.enhance_calc.CalculationExpression.get ==="
"$PYCDC" "$DIR/data.enhance_calc.CalculationExpression.get/CalculationExpression.get.pyc" 2>/dev/null

echo ""
echo "=== data.enhance_calc.CalculationExpression.__init__ ==="
"$PYCDC" "$DIR/data.enhance_calc.CalculationExpression.__init__/CalculationExpression.__init__.pyc" 2>/dev/null

echo ""
echo "=== data.ship_attr_calc.AttackCalculator (all methods) ==="
for d in $(ls -d "$DIR"/data.ship_attr_calc.AttackCalculator.* 2>/dev/null); do
    for f in "$d"/*.pyc; do
        [ -f "$f" ] || continue
        echo "--- $(basename "$d") ---"
        "$PYCDC" "$f" 2>/dev/null | head -30
        echo ""
    done
done
