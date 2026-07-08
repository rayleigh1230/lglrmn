"""Patch pycdc ASTree.cpp to handle Python 3.11 opcodes:
- POP_JUMP_FORWARD_IF_NONE_A
- POP_JUMP_FORWARD_IF_NOT_NONE_A
- MAKE_CELL_A (no-op)
- COPY_FREE_VARS_A (no-op)

These are known to pycdc's opcode table but missing from the decompiler's switch.
"""
import re
from pathlib import Path

ASTREE = Path.home() / "pycdc" / "ASTree.cpp"
text = ASTREE.read_text(encoding="utf-8")
orig = text


def must_replace(old, new, count=1):
    global text
    if text.count(old) < count:
        raise SystemExit(f"FAIL: pattern not found / not enough occurrences:\n{old[:200]}")
    text = text.replace(old, new, count)


# 1. Add NONE/NOT_NONE to the shared conditional jump case list
must_replace(
    "        case Pyc::POP_JUMP_FORWARD_IF_FALSE_A:\n"
    "        case Pyc::POP_JUMP_FORWARD_IF_TRUE_A:\n",
    "        case Pyc::POP_JUMP_FORWARD_IF_FALSE_A:\n"
    "        case Pyc::POP_JUMP_FORWARD_IF_TRUE_A:\n"
    "        case Pyc::POP_JUMP_FORWARD_IF_NONE_A:\n"
    "        case Pyc::POP_JUMP_FORWARD_IF_NOT_NONE_A:\n",
)

# 2. Add to the "Pop condition before the jump" check
must_replace(
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_FALSE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_TRUE_A\n"
    "                        || opcode == Pyc::INSTRUMENTED_POP_JUMP_IF_FALSE_A\n"
    "                        || opcode == Pyc::INSTRUMENTED_POP_JUMP_IF_TRUE_A) {\n"
    "                    /* Pop condition before the jump */",
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_FALSE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_TRUE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_NONE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_NOT_NONE_A\n"
    "                        || opcode == Pyc::INSTRUMENTED_POP_JUMP_IF_FALSE_A\n"
    "                        || opcode == Pyc::INSTRUMENTED_POP_JUMP_IF_TRUE_A) {\n"
    "                    /* Pop condition before the jump */",
)

# 3. Offset is relative for FORWARD jumps - add NONE/NOT_NONE
must_replace(
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_TRUE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_FALSE_A) {\n"
    "                    /* Offset is relative in these cases */",
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_TRUE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_FALSE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_NONE_A\n"
    "                        || opcode == Pyc::POP_JUMP_FORWARD_IF_NOT_NONE_A) {\n"
    "                    /* Offset is relative in these cases */",
)

# 4. Add MAKE_CELL_A and COPY_FREE_VARS_A as no-ops near PRECALL/RESUME
must_replace(
    "        case Pyc::PRECALL_A:\n"
    "        case Pyc::RESUME_A:\n"
    "        case Pyc::INSTRUMENTED_RESUME_A:\n"
    "            /* We just entirely ignore this / no-op */\n"
    "            break;\n",
    "        case Pyc::PRECALL_A:\n"
    "        case Pyc::RESUME_A:\n"
    "        case Pyc::INSTRUMENTED_RESUME_A:\n"
    "        case Pyc::MAKE_CELL_A:\n"
    "        case Pyc::COPY_FREE_VARS_A:\n"
    "            /* We just entirely ignore this / no-op */\n"
    "            break;\n",
)

# 5. The else_pop condition at lines ~211-215 also needs NONE/NOT_NONE added (optional, best-effort)
try:
    must_replace(
        "                && opcode != Pyc::POP_JUMP_FORWARD_IF_FALSE_A\n"
        "                && opcode != Pyc::JUMP_IF_TRUE_A\n",
        "                && opcode != Pyc::POP_JUMP_FORWARD_IF_FALSE_A\n"
        "                && opcode != Pyc::POP_JUMP_FORWARD_IF_NONE_A\n"
        "                && opcode != Pyc::POP_JUMP_FORWARD_IF_NOT_NONE_A\n"
        "                && opcode != Pyc::JUMP_IF_TRUE_A\n",
    )
except SystemExit:
    print("[WARN] step 5 (else_pop condition) skipped - pattern not found, non-critical")

if text == orig:
    raise SystemExit("FAIL: no changes made")
ASTREE.write_text(text, encoding="utf-8")
print(f"OK: patched {ASTREE}")
print(f"  added POP_JUMP_FORWARD_IF_NONE/NOT_NONE to conditional jumps")
print(f"  added MAKE_CELL/COPY_FREE_VARS as no-ops")
