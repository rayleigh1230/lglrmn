# Source Generated with Decompyle++
# File: get_intell_explore_status.pyc (Python 3.11)

record = None
is_checked = False
is_rewarded = False
UserIntelligenceRewardField = UserIntelligenceRewardField
import common.config.table_definition
table = GameDataMgr().get_table(TableID.USER_INTELLIGENCE_REWARD)
for _record in six.itervalues(table):
    if _record[UserIntelligenceRewardField.INTELLIGENCE_ID] == intell_id:
        record = _record
    
    if record:
        is_checked = record[UserIntelligenceRewardField.FINISH_STATUS] == UserIntelligenceRewardField.FinishStatus.FINISH_STATUS_DONE
        is_rewarded = record[UserIntelligenceRewardField.REWARD_STATUS] == UserIntelligenceRewardField.RewardStatus.REWARD_STATUS_GOT
return (record, is_checked, is_rewarded)
