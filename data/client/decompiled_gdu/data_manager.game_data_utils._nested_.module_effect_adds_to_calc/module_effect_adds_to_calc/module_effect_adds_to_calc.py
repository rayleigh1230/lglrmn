# Source Generated with Decompyle++
# File: module_effect_adds_to_calc.pyc (Python 3.11)

calc = EnhanceCalculator(CalculationExpression(name))
for add in adds:
    calc.bind_values(DiffData, add.enhance_name, add.value, name)
    return calc
