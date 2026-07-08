# Source Generated with Decompyle++
# File: _collect_expression.pyc (Python 3.11)

if exp.left_operand:
    self._collect_expression(exp.left_operand)
    self._collect_expression(exp.right_operand)
    return None
if None(exp, CalculationExpression):
    old_exp = self.name_2_expressions.get(exp.expression_name)
    if old_exp and old_exp is not exp:
        print('[EnhanceCalculator] Warning: expression name conflict: {}'.format(exp.expression_name))
    self.name_2_expressions[exp.expression_name] = exp
    return None
