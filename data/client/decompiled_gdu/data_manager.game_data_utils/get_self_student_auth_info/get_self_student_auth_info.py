# Source Generated with Decompyle++
# File: get_self_student_auth_info.pyc (Python 3.11)

StudentAuthInfo = StudentAuthInfo
RewardState = RewardState
import common.config.college_auth_config
auth_record = GameDataMgr().get_record(TableID.USER_STUDENT_AUTH, GameDataMgr().user_id)
if auth_record:
    return StudentAuthInfo(auth_record[UserStudentAuthField.SCHOOL_ID], auth_record[UserStudentAuthField.SCHOOL_NAME], auth_record[UserStudentAuthField.REWARD], auth_record[UserStudentAuthField.SHOW_SCHOOL_FLAG])
return StudentAuthInfo(0, '', RewardState.NOT_GET, UserStudentAuthField.ShowFlag.SHOW_FLAG_SELF)
