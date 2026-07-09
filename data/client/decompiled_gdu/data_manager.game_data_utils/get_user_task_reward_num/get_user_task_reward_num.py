# Source Generated with Decompyle++
# File: get_user_task_reward_num.pyc (Python 3.11)

Tb_cfg_task_chapter = Tb_cfg_task_chapter
import common.config.db
record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
chapter_idx = record[UserStuffField.TASK_CHAPTER]
config = Tb_cfg_task_chapter.get(chapter_idx + 1)
if not config:
    return 0
task_id_list = None(config[Tb_cfg_task_chapter.TASK_IDS], True)
num = 0
task_table = GameDataMgr().get_table(TableID.TASK)
if task_table:
    for task_id, record in six.iteritems(task_table):
        if record[TaskField.GOT_AWARD] == 0 and record[TaskField.IS_COMPLETED] == 1 and record[TaskField.TASK_ID] in task_id_list:
            num += 1
        return num
