# Tiny Stack VM

[![tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/kuro1996/tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/kuro1996/tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

Entry for make.fun's [tiny-stack-vm-01-run-20261122](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
on [make.fun](https://make.fun) — a tiny stack virtual machine in one `main.ts`.

## The VM

`main.ts` runs all 40 ISA programs in one run: 32-bit wrapping arithmetic
(`Math.imul` low-32 MUL, signed/unsigned DIV/MOD/LTU), shifts masked to 5 bits,
sign-extended PUSH8, 256-value stack, 64-deep call stack, 256 words of memory,
and all ten traps with their exact codes (step limit 1M, output cap 64K).
Practice set: 40/40 instances, score 1,000,000, deterministic.

## Run it

```sh
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```
