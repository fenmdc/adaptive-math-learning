# Diagnostic Calibration v1

Status: implemented.

Diagnostic Calibration v1 turns Diagnostic Mode from a simple sequence of
questions into a measured placement instrument. The goal is to say not only
what the learner missed, but how reliable the diagnostic evidence is.

## Blueprint Targets

The current blueprint has 22 calibrated slots.

| Stage | Slots | Purpose |
| --- | ---: | --- |
| Foundation | 5 | Check arithmetic prerequisites before interpreting algebra or AMC8 misses. |
| Bridge | 4 | Check symbol fluency, expression handling, and translation into algebra. |
| Algebra Readiness | 6 | Check whether Pre-Algebra evidence supports Algebra 1 placement. |
| AMC8 Transfer | 7 | Check transfer across geometry, number theory, counting, and data contexts. |

## Calibration Signals

Each stage now tracks:

- expected slots
- completed slots
- accuracy
- low-confidence signals
- slow-response signals
- stage calibration status
- stage confidence

Overall confidence is reported as:

- `High`: nearly full evidence and most stages calibrated
- `Medium`: enough evidence for a useful placement, but some stage uncertainty
- `Low`: insufficient evidence or too many missing/unstable stage signals

## Product Behavior

Diagnostic Mode now shows:

- live calibration confidence
- stage-level calibration cards
- blueprint coverage status
- retest recommendation
- next checkpoint recommendation

Diagnostic reports now persist:

- calibration confidence
- completed versus expected evidence slots
- stage evidence details
- retest timing guidance

Dashboard displays the latest calibration confidence alongside placement.

## Quality Gate

Run:

```bash
npm run quality:diagnostic
```

Expected result:

- all diagnostic slots selected
- each stage meets its minimum evidence target
- no warnings
- no errors

## Next Upgrade Path

Diagnostic Calibration v1 is still fixed-blueprint. The next version can add:

- shorter checkpoint diagnostics after a high-confidence full assessment
- adaptive branching after early Foundation or Algebra Readiness failure
- reliability weighting by item quality and problem source
- parent-facing diagnostic report wording
