import re

with open('/home/user/app/src/pages/Home/index.tsx') as f:
    content = f.read()

i = 0
n = len(content)
stack = []
line = 1
while i < n:
    ch = content[i]
    if ch == '\n':
        line += 1
        i += 1
        continue
    if content.startswith('<motion.div', i):
        j = i + len('<motion.div')
        depth_brace = 0
        in_string = None
        self_closing = False
        start_line = line
        temp_line = line
        while j < n:
            c = content[j]
            if c == '\n':
                temp_line += 1
            if in_string:
                if c == in_string:
                    in_string = None
                j += 1
                continue
            if c == '"' or c == "'":
                in_string = c
                j += 1
                continue
            if c == '{':
                depth_brace += 1
            elif c == '}':
                depth_brace -= 1
            elif c == '/' and depth_brace == 0 and j + 1 < n and content[j+1] == '>':
                self_closing = True
                j += 2
                break
            elif c == '>' and depth_brace == 0:
                j += 1
                break
            j += 1
        consumed = content[i:j]
        nl = consumed.count('\n')
        line += nl
        if not self_closing:
            stack.append(start_line)
        i = j
        continue
    if content.startswith('</motion.div>', i):
        if stack:
            popped = stack.pop()
        else:
            print('extra close at line', line)
        i += len('</motion.div>')
        continue
    i += 1

print('unclosed opens at lines:', stack)
