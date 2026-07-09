# Source Generated with Decompyle++
# File: get_racing_channel_log_msg.pyc (Python 3.11)

(log_type, name, count) = JsonUtil.loads(msg)
titles = [
    language.ACTIVITY_SPRING_CHAT_SYSTEM_LOG_1,
    language.ACTIVITY_SPRING_CHAT_SYSTEM_LOG_2,
    language.ACTIVITY_SPRING_CHAT_SYSTEM_LOG_3]
return titles[log_type - 1].format(name)
