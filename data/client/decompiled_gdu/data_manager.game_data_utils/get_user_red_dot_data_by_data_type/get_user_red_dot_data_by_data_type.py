# Source Generated with Decompyle++
# File: get_user_red_dot_data_by_data_type.pyc (Python 3.11)

_data = get_user_red_dot_data(red_dot_type, red_dot_key)
if isinstance(_data, str):
    _value = _data
elif isinstance(_data, list) and _data:
    _value = _data[0]
else:
    _value = None
if data_type == RED_DOT_FOR_INT:
    result = 0
    if _value:
        result = int(_value)
    else:
        
        try:
            except Exception:
                e = None
                utils = utils
                import common
                utils.check_condition_error(False, 'get_user_red_dot_data_by_data_type:Error occurred while converting int.', 'value:{}, error:{}'.format(_value, e))
                e = None
                del e
            except:
                e = None
                del e
            return result
            if data_type == RED_DOT_FOR_FLOAT:
                result = 0
                if _value:
                    result = float(_value)
                else:
                    except Exception:
                        e = None
                        
                        try:
                            utils = utils
                            import common
                        except:
                            None(False, 'get_user_red_dot_data_by_data_type:Error occurred while converting float.', 'value:{}, error:{}'.format(_value, e))
                            e = None
                            del e
                        except:
                            e = None
                            del e

                        return result
                        if data_type == RED_DOT_FOR_BOOL:
                            return _value == '1' if _value else False
                        return None

