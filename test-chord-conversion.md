# Chord Conversion Test

## Potential Issues Found:

### 1. Modulo operator with negative numbers
In Python: `(-5) % 12 = 7`
In JavaScript/TypeScript: `(-5) % 12 = -5`

This is a **critical difference**! The modulo operator behaves differently for negative numbers.

### Solution:
We need to use a proper modulo function that handles negative numbers like Python does.

```typescript
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
```

This ensures that the result is always positive, matching Python's behavior.

### Places this affects:
1. `intervalToIndex` function - when `qi` is negative
2. Bass note calculation - `((bass - root) * 7) % 12`

Let me check the code for these issues.
