# Source Generated with Decompyle++
# File: parse_help_tips.pyc (Python 3.11)

result = []
segments = help_tips.split('\\>')
for segment in segments:
    title_sep = segment.find('\n')
    if title_sep != -1:
        title = segment[:title_sep]
        desc = segment[title_sep + 1:]
        result.append((title, desc))
    return result
