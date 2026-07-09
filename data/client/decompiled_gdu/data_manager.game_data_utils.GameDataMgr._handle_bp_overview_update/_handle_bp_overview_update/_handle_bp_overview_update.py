# Source Generated with Decompyle++
# File: _handle_bp_overview_update.pyc (Python 3.11)

common_definition = common_definition
import common
_id = updated_record[ShipBpOverviewField.ID]
if ShipBpOverviewField.LEVEL in updated_record and _id in self.bp_overview_level_dict:
    if updated_record[ShipBpOverviewField.LEVEL] - self.bp_overview_level_dict[_id] > 0:
        GameEventManager().notify(common_definition.NotifyType.NEWBIE_HELP_GUIDE, common_definition.HelpGuideType.BLUEPRINT_UPGRADE)
        ADInterface().send_ad_event(ad_interface.ADEventName.upgrade_blueprint)
    ADInterface().send_blueprint_lv(updated_record[ShipBpOverviewField.LEVEL])
if ShipBpOverviewField.RESEARCH_POINT in updated_record and _id in self.research_point_dict and updated_record[ShipBpOverviewField.RESEARCH_POINT] - self.research_point_dict[_id] > 0:
    GameEventManager().notify(common_definition.NotifyType.NEWBIE_HELP_GUIDE, common_definition.HelpGuideType.BLUEPRINT_UPGRADE)
    ADInterface().send_ad_event(ad_interface.ADEventName.increase_tech)
if ShipBpOverviewField.RESEARCH_POINT_SEASON in updated_record or _id in self.research_point_season_dict or updated_record[ShipBpOverviewField.RESEARCH_POINT_SEASON] - self.research_point_season_dict[_id] > 0:
    GameEventManager().notify(common_definition.NotifyType.NEWBIE_HELP_GUIDE, common_definition.HelpGuideType.BLUEPRINT_UPGRADE)
    ADInterface().send_ad_event(ad_interface.ADEventName.increase_tech)
    return None
return None
return None
