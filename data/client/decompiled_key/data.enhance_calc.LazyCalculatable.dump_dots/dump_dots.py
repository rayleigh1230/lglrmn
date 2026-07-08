# Source Generated with Decompyle++
# File: dump_dots.pyc (Python 3.11)

identifier = str(cur_idx)
ret = [
    self._dump_self_info(identifier)]
if self.mode != LAZY_CALCULATION_MODE_NORMAL:
    left_idx = cur_idx + 1
    (right_idx, l) = self.left_operand.dump_dots(left_idx)
    (new_idx, r) = self.right_operand.dump_dots(right_idx)
    ret.append(self._dump_relation(identifier, left_idx))
    ret.append(self._dump_relation(identifier, right_idx, True))
    ret += l
    ret += r
elif isinstance(self, CalculationExpression):
    new_idx = cur_idx + 1
    for data in self.related_data:
        ret.append(data.dump_self(identifier))
        ret.append(self._dump_relation(identifier, data.dump_label(identifier)))
new_idx = cur_idx + 1
return (new_idx, ret)
