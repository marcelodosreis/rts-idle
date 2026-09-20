---
status: open
classe: presentation
barreira: null
regressao: []
---

# Postmortem Template

Use one file per bug/malfunction, named `docs/postmortems/YYYY-MM-DD-<slug>.md`.

## Summary

One paragraph: what broke, where, when, and its impact.

## Symptom

What the user/operator observed.

## Root cause

Why it actually happened — the underlying defect, not where it manifested.

## What we missed

The process/test gap that let this reach a user. Be specific: which test should have caught it, which acceptance criterion was missing.

## Fix

What changed to correct the root cause (with file references).

## Regression

The permanent test added that fails without the fix. Reference the file and what it asserts.

## Prevention

How the process now guarantees this class of bug cannot recur (regression test, acceptance criterion, automated barrier, rule).

## Verification

Commands run and results proving the fix and the regression test pass.