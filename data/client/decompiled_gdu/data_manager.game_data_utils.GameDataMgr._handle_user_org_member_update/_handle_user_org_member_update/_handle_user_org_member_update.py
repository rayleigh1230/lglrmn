# Source Generated with Decompyle++
# File: _handle_user_org_member_update.pyc (Python 3.11)

OrganizationViewMgr = OrganizationViewMgr
import data_manager.organization.organization_view_mgr
OrganizationDataMgr = OrganizationDataMgr
import data_manager.organization.organization_data_mgr
user_id = update_record[UserOrganizationMemberField.USERID]
if user_id == self.user_id:
    if UserOrganizationMemberField.UNIQUE_ORGANIZATION_ID in update_record:
        new_org_id = update_record[UserOrganizationMemberField.UNIQUE_ORGANIZATION_ID]
        old_org_id = _old_record[UserOrganizationMemberField.UNIQUE_ORGANIZATION_ID]
        if new_org_id:
            org_name = update_record.get(UserOrganizationMemberField.ORGANIZTION_NAME)
            org_name = language.trans(org_name)
            GameEventManager().notify('toast_text', language.trans(language.HAS_JOIN_ORG_FORMAT).format(org_name))
            GameEventManager().notify('[Organization]new_org_apply_success')
        else:
            OrganizationViewMgr()._close_ui_when_kick_out()
            GameEventManager().notify('toast_text', language.trans(language.HAS_QUIT_ORG))
            GameEventManager().notify('[Organization]quit_organization')
        return None
    if None.MEMBER_COUNT in update_record or UserOrganizationMemberField.MEMBER_COUNT in _old_record or update_record[UserOrganizationMemberField.MEMBER_COUNT] != _old_record[UserOrganizationMemberField.MEMBER_COUNT]:
        OrganizationViewMgr().refresh_organization_member_view()
        OrganizationDataMgr().request_organization_info()
        return None
    return None
return None
return None
