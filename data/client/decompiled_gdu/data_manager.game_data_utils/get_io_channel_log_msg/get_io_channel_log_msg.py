# Source Generated with Decompyle++
# File: get_io_channel_log_msg.pyc (Python 3.11)

io_log_event_dict = {
    IoTeamworkMemberField.LogType.LOG_TYPE_QUIT: language.IO_LOG_QUIT,
    IoTeamworkMemberField.LogType.LOG_TYPE_JOIN: language.IO_LOG_JOIN }
event = int(io_log_msg[0])
player_name = io_log_msg[1]
return io_log_event_dict[event].format(player_name)
