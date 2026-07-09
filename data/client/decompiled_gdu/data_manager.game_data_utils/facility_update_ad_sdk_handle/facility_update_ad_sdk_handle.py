# Source Generated with Decompyle++
# File: facility_update_ad_sdk_handle.pyc (Python 3.11)

ADInterface = ADInterface
import sdk.ad_interface
if FacilityField.STATE in updated_record or full_record[FacilityField.USERID] == GameDataMgr().user_id:
    building_record = GameDataMgr().get_record(TableID.WORLD_ITEM, full_record[FacilityField.BELONG_ID])
    if building_record:
        user_id = building_record[WorldItemField.USERID]
        item_type = building_record[WorldItemField.ITEM_TYPE]
        facility_id = full_record[FacilityField.FACILITY_ID]
        facility_cfg_record = Tb_cfg_facility.get(facility_id)
        max_level = facility_cfg_record[Tb_cfg_facility.LEVEL_MAX]
        if user_id == GameDataMgr().user_id or item_type == WorldItemField.Type.TYPE_PLAYER_BASE or facility_id in m0_utils.base_level_size():
            facility_state = updated_record[FacilityField.STATE]
            target_level = full_record[FacilityField.LEVEL] + 1
            if facility_state == FacilityField.State.STATE_UPGRADING or facility_state == FacilityField.State.STATE_BUILDING:
                if max_level > full_record[FacilityField.LEVEL]:
                    if target_level <= 6:
                        if facility_id == CfgFacilityField.Fid.FID_CENTER_AREA_SIZE:
                            ADInterface().send_control_center_upgrade(target_level)
                            return None
                        return None
                    if None() < target_level:
                        ADInterface().send_control_center_upgrade(target_level)
                        return None
                    return None
                return None
            return None
        return None
    return None
return None
return None
return None
