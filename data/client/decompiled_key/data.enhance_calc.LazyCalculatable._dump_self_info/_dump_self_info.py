# Source Generated with Decompyle++
# File: _dump_self_info.pyc (Python 3.11)

if self.mode == LAZY_CALCULATION_MODE_NORMAL:
    if isinstance(self, CalculationExpression):
        info = 'Variable {}'.format(self.expression_name)
    else:
        info = 'Constant {}'.format(self.constant_val)
elif self.mode == LAZY_CALCULATION_MODE_MUL:
    info = '*'
elif self.mode == LAZY_CALCULATION_MODE_DIV:
    info = '/'
elif self.mode == LAZY_CALCULATION_MODE_FLOOR_DIV:
    info = '//'
elif self.mode == LAZY_CALCULATION_MODE_PLUS:
    info = '+'
elif self.mode == LAZY_CALCULATION_MODE_MINUS:
    info = '-'
elif self.mode == LAZY_CALCULATION_MODE_MAX:
    info = 'max'
elif self.mode == LAZY_CALCULATION_MODE_MIN:
    info = 'min'
else:
    info = 'unknown'
return '  "{}"[label="{}"];'.format(identifier, info)
