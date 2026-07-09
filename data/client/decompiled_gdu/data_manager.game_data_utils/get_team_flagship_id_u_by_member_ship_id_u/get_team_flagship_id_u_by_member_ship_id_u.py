# Source Generated with Decompyle++
# File: get_team_flagship_id_u_by_member_ship_id_u.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
ship_record = strategy.get_ship_record(ship_id_u)
if ship_record or ship_record[ShipField.TEAM_ID]:
    team_record = strategy.get_team_record(ship_record[ShipField.TEAM_ID])
    if team_record:
        return team_record[TeamField.FLAGSHIP_ID_U]
    return None
return None
