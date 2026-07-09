# Source Generated with Decompyle++
# File: get_new_task_red_point_num.pyc (Python 3.11)

num = 0
mission_system_utils = mission_system_utils
import data_manager.mission_system
unread_mission_packs = mission_system_utils.get_unread_mission_packs(True)
unreceived_reward_missions = mission_system_utils.get_unreceived_reward_missions()
unreceived_reward_mission_packs = mission_system_utils.get_unreceived_reward_mission_packs()
for mission_pack_uid_list in six.itervalues(unread_mission_packs):
    num += len(mission_pack_uid_list)
    for mission_pack_uid_list in six.itervalues(unreceived_reward_mission_packs):
        num += len(mission_pack_uid_list)
        for mission_pack_uid, mission_uid_list in six.iteritems(unreceived_reward_missions):
            num += len(mission_uid_list)
            return num
