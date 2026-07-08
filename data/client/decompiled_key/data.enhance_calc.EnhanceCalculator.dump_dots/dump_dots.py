# Source Generated with Decompyle++
# File: dump_dots.pyc (Python 3.11)

dump_info = [
    'digraph {}Graph '.format(self.__class__.__name__) + '{'] + self.cur_expression.dump_dots(0)[1] + [
    '}']
f = open('calc.dot', 'w')
f.write('\n'.join(dump_info))
None(None, None)
