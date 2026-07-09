# Source Generated with Decompyle++
# File: _handle_facility_update.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
facility_id_u = updated_record[FacilityField.PRIMARY_KEY]
facility_record = GameDataMgr().get_record(TableID.FACILITY, facility_id_u)
if facility_record:
    facility_id = facility_record[FacilityField.FACILITY_ID]
    if FacilityField.LEVEL in updated_record:
        game_data_utils.add_to_facility_finished_tips(facility_record[FacilityField.BELONG_ID], facility_id)
        if facility_id in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
            scheme_recommend_data = scheme_recommend_data
            import data_manager
            scheme_recommend_data.scheme_recommend_guide()
    game_data_utils.facility_update_ad_sdk_handle(updated_record, facility_record)
newbie_wealth_can_show = newbie_wealth_can_show
import activity.activity_first_pay
RedPointSystem().notify_point_num(RedPointName.ACTIVITY_NORMAL_WEALTH, 1 if newbie_wealth_can_show() else 0)
self._handle_user_red_dot_update()
