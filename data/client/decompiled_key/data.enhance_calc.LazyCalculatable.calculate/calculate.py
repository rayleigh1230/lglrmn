# Source Generated with Decompyle++
# File: calculate.pyc (Python 3.11)

if self.mode == LAZY_CALCULATION_MODE_NORMAL:
    return self.get(getter)
left_val = self.left_operand.calculate(getter) if None.left_operand else None
right_val = self.right_operand.calculate(getter) if self.right_operand else None
if self.mode == LAZY_CALCULATION_MODE_MUL:
    return left_val * right_val
if None.mode == LAZY_CALCULATION_MODE_DIV:
    return left_val / right_val
if None.mode == LAZY_CALCULATION_MODE_FLOOR_DIV:
    return left_val // right_val
if None.mode == LAZY_CALCULATION_MODE_PLUS:
    return left_val + right_val
if None.mode == LAZY_CALCULATION_MODE_MINUS:
    return left_val - right_val
if None.mode == LAZY_CALCULATION_MODE_MAX:
    return max(left_val, right_val)
if None.mode == LAZY_CALCULATION_MODE_MIN:
    return min(left_val, right_val)
if None.mode == LAZY_CALCULATION_MODE_INT:
    return int(left_val)
raise None('Unknown calculation mode: {}'.format(self.mode))
