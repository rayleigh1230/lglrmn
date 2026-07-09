# Source Generated with Decompyle++
# File: _handle_bp_overview_insert.pyc (Python 3.11)

_id = new_record[ShipBpOverviewField.ID]
level = new_record[ShipBpOverviewField.LEVEL]
rp_point = new_record[ShipBpOverviewField.RESEARCH_POINT]
rp_season_point = new_record[ShipBpOverviewField.RESEARCH_POINT_SEASON]
self.bp_overview_level_dict[_id] = level
self.research_point_dict[_id] = rp_point
self.research_point_season_dict[_id] = rp_season_point
