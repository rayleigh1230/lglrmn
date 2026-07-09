# Source Generated with Decompyle++
# File: goods_price_spliter.pyc (Python 3.11)

import re
num_pattern = re.compile('[0-9,.\\s]+')

try:
    price_num = num_pattern.findall(price_str)[0]
    price_symbol = price_str.replace(price_num, '')
    return (price_symbol, price_num)
    except Exception:
        e = None
        print(e)
        e = None
        del e
        return (None, None)
        e = None
        del e

