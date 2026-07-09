# Source Generated with Decompyle++
# File: NamedTuple.pyc (Python 3.11)

if fields:
    fields = kwargs.items()
elif kwargs:
    raise TypeError('Either list of fields or keywords can be provided to NamedTuple, not both')
return _make_nmtuple(typename, fields, module = _caller())
