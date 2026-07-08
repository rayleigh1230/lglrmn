# Source Generated with Decompyle++
# File: get_bp_use_research_point.pyc (Python 3.11)

if self.bp_use_research_point:
    self.update_bp_use_research_point()
total_num = self.bp_use_research_point
if not include_unlock_system:
    total_num -= self.bp_use_research_point_unlock_system
if not include_unlock_scheme:
    total_num -= self.bp_use_research_point_unlock_scheme
return total_num
