# Source Generated with Decompyle++
# File: unregister_event.pyc (Python 3.11)

if registrant:
    raise ValueError('registrant cant be None')
if registrant not in self._registrants:
    return None
if None._notifying_events:
    if event_type:
        if registrant in self._registrants:
            for _event_type in list(self._registrants[registrant]):
                handle_func_dict = self._event_handlers.get(_event_type)
                if _event_type in self._notifying_events:
                    self._cached_actions.append(_CachedAction(_CachedAction.ACTION_UNREGISTER, _event_type, registrant))
                    continue
                del handle_func_dict[registrant]
                if not handle_func_dict:
                    del self._event_handlers[_event_type]
                self._remove_registrant_event(registrant, _event_type)
                return None
                return None
                self._event_handlers.get(event_type) = None
                if handle_func_dict or registrant in handle_func_dict:
                    if event_type in self._notifying_events:
                        self._cached_actions.append(_CachedAction(_CachedAction.ACTION_UNREGISTER, event_type, registrant))
                        return None
                    del None[registrant]
                    if not handle_func_dict:
                        del self._event_handlers[event_type]
                    self._remove_registrant_event(registrant, event_type)
                    return None
                return None
                return None
                if event_type:
                    if registrant in self._registrants:
                        for None in self._registrants[registrant]:
                            handle_func_dict = self._event_handlers[_event_type]
                            del handle_func_dict[registrant]
                            if not handle_func_dict:
                                del self._event_handlers[_event_type]
                            del self._registrants[registrant]
                            return None
                            return None
                            handle_func_dict = self._event_handlers.get(event_type)
                            if handle_func_dict or registrant in handle_func_dict:
                                del handle_func_dict[registrant]
                                if not handle_func_dict:
                                    del self._event_handlers[event_type]
                                self._remove_registrant_event(registrant, event_type)
                                return None
                            return None
                            return None
