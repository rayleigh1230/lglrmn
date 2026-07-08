# Source Generated with Decompyle++
# File: output_name_enhance_val.pyc (Python 3.11)

ret = []
for i, enhance_name in enumerate(self.enhance_names):
    enhance_val = self.enhanced_list[i + 1] - self.enhanced_list[i]
    ret.append(named_diff(enhance_name, enhance_val))
    return ret
