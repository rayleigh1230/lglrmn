# Source Generated with Decompyle++
# File: refresh_ship_repair_hp.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
gdm = GameDataMgr()
estimate_record = gdm.get_record(SHIP_ESTIMATE, ship_uid)
if not estimate_record:
    return None
ship_utils = ship_utils
import common
if not ship_record:
    ship_record = gdm.get_record(TableID.SHIP, ship_uid)
    cur_time = time_utils.get_server_time()
    server_refresh_time = estimate_record[SHIP_REPAIR_SERVER_REFRESH_TIME]
    server_hp = estimate_record[SHIP_SERVER_HP]
    (bind_drone_hp, bind_drone_max_hp) = ship_utils.get_bind_drone_hp_info(ship_record)
    max_hp = ship_record[ShipField.HP_MAX] + bind_drone_max_hp
    delta_time = cur_time - server_refresh_time
    (cur_fix_v, seg_v) = ship_utils.get_ship_repair_fix_speed(ship_uid, fix_time, hp_segment_data, strategy = strategy)
    if seg_v:
        mid_time = ship_utils.get_ship_repair_mid_time(ship_uid, fix_time, hp_segment_data, strategy = strategy)
        if server_refresh_time < mid_time:
            if cur_time < mid_time:
                client_hp = server_hp + seg_v[0] * delta_time
            else:
                t1 = cur_time - mid_time
                t0 = delta_time - t1
                client_hp = server_hp + seg_v[0] * t0 + seg_v[1] * t1
        else:
            client_hp = server_hp + seg_v[1] * delta_time
    else:
        client_hp = server_hp + cur_fix_v * delta_time
client_hp = min(client_hp, max_hp)
notify_data = [
    gdm.update_record(SHIP_ESTIMATE, ship_uid, {
        SHIP_HP_CUR: client_hp,
        SHIP_REPAIR_REFRESH_TIME: cur_time })]
if client_hp >= max_hp:
    ship_data = ShipDataMgr().get(ship_uid)
    ship_data.health = max_hp
    notify_data.append(gdm.delete_record(SHIP_ESTIMATE, ship_uid))
return notify_data
