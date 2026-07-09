# Source Generated with Decompyle++
# File: decompress_msg.pyc (Python 3.11)

import base64
import zlib
decode_bytes = base64.b64decode(msg)
decode_str = zlib.decompress(decode_bytes[byte_offset:])
return six.ensure_str(decode_str)
