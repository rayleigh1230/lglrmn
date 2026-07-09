# Source Generated with Decompyle++
# File: filter_goods_list_by_name.pyc (Python 3.11)

name_set = set()
ret_goods_list = []
for goods in goods_list:
    if goods['name'] not in name_set:
        name_set.add(goods['name'])
        ret_goods_list.append(goods)
    return ret_goods_list
