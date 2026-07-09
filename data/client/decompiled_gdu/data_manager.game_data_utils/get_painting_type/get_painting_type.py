# Source Generated with Decompyle++
# File: get_painting_type.pyc (Python 3.11)

painting_config = Tb_cfg_painting.get(painting_id)
if not painting_config:
    return CfgPaintingField.Type.TYPE_GENERAL
info_str = None[Tb_cfg_painting.PAINTING_TYPE]
painting_type_str = info_str.split(',')[0]
if painting_type_str.isdigit():
    return int(painting_type_str)
return None.Type.TYPE_GENERAL
