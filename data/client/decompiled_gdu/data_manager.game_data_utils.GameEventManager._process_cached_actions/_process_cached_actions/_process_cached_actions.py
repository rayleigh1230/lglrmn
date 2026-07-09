# Source Generated with Decompyle++
# File: _process_cached_actions.pyc (Python 3.11)

cached_actions = []
for i, action in enumerate(self._cached_actions):
    if action.event_type == event_type:
        if action.action_type == _CachedAction.ACTION_REGISTER:
            self.register_event(action.event_type, action.handle_func, action.registrant)
            continue
        if action.action_type == _CachedAction.ACTION_UNREGISTER:
            registrant = action.registrant
            if registrant in self.unregister_look_up_dict and event_type in self.unregister_look_up_dict[registrant]:
                count = self.unregister_look_up_dict[registrant][event_type] - 1
                if count < 0:
                    del self.unregister_look_up_dict[registrant][event_type]
                    raise Exception('cached unregister event count should never less than zero!')
                if count == 0:
                    del self.unregister_look_up_dict[registrant][event_type]
                else:
                    self.unregister_look_up_dict[registrant][event_type] = count
            self.unregister_event(action.event_type, registrant)
continue
cached_actions.append(action)
continue
self._cached_actions = cached_actions
