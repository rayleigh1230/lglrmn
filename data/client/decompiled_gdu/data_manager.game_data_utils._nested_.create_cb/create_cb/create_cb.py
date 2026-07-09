# Source Generated with Decompyle++
# File: create_cb.pyc (Python 3.11)

if not utils.is_win32():
    shutil.copyfile(six.ensure_text(message, 'utf8'), six.ensure_text(qr_code_filename, 'utf8'))
game3d.encode_res_file_content(qr_code_filename)
if utils.is_win32():
    cb(qr_code_filename)
    return None
cb(pmd_file_name)
