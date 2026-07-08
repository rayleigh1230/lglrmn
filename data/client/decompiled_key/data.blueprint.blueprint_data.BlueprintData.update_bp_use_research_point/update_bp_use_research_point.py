# Source Generated with Decompyle++
# File: update_bp_use_research_point.pyc (Python 3.11)

self.bp_use_research_point = 0
(used_enhance, used_unlock_system, used_unlock_scheme, system_cost_dict) = blueprint_utils.cal_bp_record_use_research_point(self.blueprint_record)
self.bp_use_research_point = used_enhance + used_unlock_system + used_unlock_scheme
self.bp_use_research_point_unlock_system = used_unlock_system
self.bp_use_research_point_unlock_scheme = used_unlock_scheme
self.system_cost_point_dict = system_cost_dict
