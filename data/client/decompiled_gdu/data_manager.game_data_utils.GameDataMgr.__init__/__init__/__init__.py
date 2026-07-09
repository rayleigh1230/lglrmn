# Source Generated with Decompyle++
# File: __init__.pyc (Python 3.11)

self.shipyard_ship_uids = { }
self.shipyard_fix_info = { }
self._military_drill_npc_team_info_dict = { }
self.all_team_record_list = StepDoublyLinkedList()
self.all_team_record_node_dict = { }
self.reset_data()
self._logger = logging.getLogger(__name__)
self.data_event_mgr = DataEventMgr()
self.new_2022_protocol_table = (TorpedoField, EffectBeaconField, UserBountyTaskField)
self.union_user_list = set()
self.union_mark_list = []
self.league_mark_list = []
self.union_intelligence_list = set()
self.organization_hub_info = None
self.self_intelligence_list = set()
self.city_union_member_list = set()
self.league_organization_list = set()
self.npc_city_union_id = { }
self.union_view_item_dict = { }
self.l4_ruin_city_lst = { }
self.league_plan_view_dict = { }
self.league_plan_info_dict = { }
self.union_building_plan_dict = { }
self.union_building_item_list = []
self.union_building_alert_dict = { }
self.is_in_union = False
self.union_building_table = [
    TableID.PLAN,
    TableID.WORLD_ITEM,
    TableID.USER_ALERT]
self.dock_item_wid_2_cfg_id = { }
self.subscriber_timer = None
self._rendezvous_subscriber_timer = None
self._dock_item_subscriber_timer = None
self._cache_quick_research_pack_id_u = None
self.channel_data = None
self.register_data_event()
GameDataMgr.need_destroy_cache(self.destroy)
