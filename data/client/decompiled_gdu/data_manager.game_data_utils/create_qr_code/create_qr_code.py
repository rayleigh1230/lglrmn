# Source Generated with Decompyle++
# File: create_qr_code.pyc (Python 3.11)

import os
import shutil
import game3d
import unisdk
utils = utils
import common
qr_code_file_name = 'qr_code_file'
qr_code_dir_path = os.path.join(game3d.get_doc_dir(), 'res', qr_code_file_name)
qr_code_filename = os.path.join(qr_code_dir_path, file_name)
pmd_file_name = os.path.join(qr_code_file_name, file_name)
create_file_name = qr_code_filename if utils.is_win32() else file_name
if not os.path.exists(qr_code_dir_path):
    os.mkdir(qr_code_dir_path)
if os.path.exists(qr_code_filename):
    os.remove(qr_code_filename)

def create_cb(message = None):
    if not utils.is_win32():
        shutil.copyfile(six.ensure_text(message, 'utf8'), six.ensure_text(qr_code_filename, 'utf8'))
    game3d.encode_res_file_content(qr_code_filename)
    if utils.is_win32():
        cb(qr_code_filename)
        return None
    cb(pmd_file_name)

unisdk.setOnCreateQRCodeDone(create_cb)
unisdk.ntCreateQRCode(content, width, height, create_file_name)
