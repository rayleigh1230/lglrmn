# Source Generated with Decompyle++
# File: item_can_buy.pyc (Python 3.11)

total_amount = item_purchase_limit_amount.get(item_id, 0)
if total_amount == 0:
    return True
can_purchase_amount = None(0, total_amount - item_purchased_amount.get(item_id, 0))
if can_purchase_amount == 0:
    return False
