# Source Generated with Decompyle++
# File: bind_values.pyc (Python 3.11)

bind_expression = self.name_2_expressions.get(expression_name)
if bind_expression:
    raise RuntimeError('Expression name not found: {}'.format(expression_name))
obj = tp(data_name, val, bind_expression, self)
bind_expression.related_data.append(obj)
