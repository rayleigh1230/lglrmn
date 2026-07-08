# Source Generated with Decompyle++
# File: enhance_desc_detail.pyc (Python 3.11)

if priority_table:
    priority_table = dict()

def _p(exp = None):
    return priority_table.get(exp.expression_name, len(priority_table))


def _cmp_exp(a = None, b = None):
    return cmp(_p(a), _p(b))

expressions = list(self.name_2_expressions.values())
expressions.sort(key = cmp_to_key(_cmp_exp))
added_expression = []

def getter(diff_data = None):
    return diff_data.get_full() if diff_data.expression in added_expression else diff_data.get()

self.clear_activate()
enhancements_name = []
base_val = self.calculate()
each_diff_list = [
    base_val]
for exp in expressions:
    added_expression.append(exp)
    cur_val = self.get_expression().calculate(getter = getter)
    diff = cur_val - each_diff_list[-1]
    enhance_sum = (lambda .0: pass# WARNING: Decompyle incomplete
)(exp.related_data())
    for data in exp.related_data:
        if isinstance(data, DiffData) or data.get_full() == 0:
            continue
        percent = float(data.get_full()) / enhance_sum
        enhance_caused_diff = diff * percent
        enhancements_name.append(data.data_name)
        last_val = each_diff_list[-1]
        each_diff_list.append(last_val + enhance_caused_diff)
        return ParsedEnhanceDesc(enhancements_name, each_diff_list)
