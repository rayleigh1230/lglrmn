# Source Generated with Decompyle++
# File: get_converted_painting_id.pyc (Python 3.11)

painting_type = get_painting_type(painting_id)
if painting_type == CfgPaintingField.Type.TYPE_PAINTING_SP:
    main_ship_id = get_ship_id_by_painting_id(painting_id)
    if main_ship_id:
        ship_id = main_ship_id * 100 + 1
        ship_cfg = Tb_cfg_ship.get(ship_id)
        company_id = ship_cfg[Tb_cfg_ship.COMPANY_ID]
        COMPANY_ID_TO_STATIC_PEAK_PAINTING_ID = COMPANY_ID_TO_STATIC_PEAK_PAINTING_ID
        import ui.ship_macro.ship_macro_config
        return COMPANY_ID_TO_STATIC_PEAK_PAINTING_ID.get(company_id)
    parse_cfg_id = parse_cfg_id
    import common.config.cfg_utils
    parsed_painting_id = parse_cfg_id(painting_id)
    if bool(parsed_painting_id):
        painting_id = parsed_painting_id
return painting_id
