# Source Generated with Decompyle++
# File: _replace.pyc (Python 3.11)

result = self._make(_map(kwds.pop, field_names, self))
if kwds:
    raise ValueError(f'''Got unexpected field names: {list(kwds)!r}''')
return result
