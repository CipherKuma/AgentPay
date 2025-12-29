# Add Provider

Add a new compute provider integration to AgentPay.

**Usage:**
```
/add-provider <provider-name>
```

**Example:**
```
/add-provider groq
```

## Steps

1. **Research Provider API**
   - Look up provider documentation via Context7
   - Understand authentication method
   - List supported models and pricing

2. **Create Provider File**
   ```
   server/src/providers/<provider-name>.ts
   ```

3. **Implement Provider Interface**
   ```typescript
   export const <name>Provider: Provider = {
     id: '<provider-name>',
     name: '<Display Name>',
     models: [...],
     async inference(request): Promise<InferenceResponse>,
     getPricing(model): number,
     async healthCheck(): Promise<boolean>,
   }
   ```

4. **Register Provider**
   - Add to `server/src/providers/index.ts`
   - Update routing engine configuration

5. **Add Environment Variable**
   - Add API key to `.env.example`
   - Document in CLAUDE.md

6. **Test Integration**
   - Unit test for provider
   - Integration test with real API

## Provider Interface

```typescript
interface Provider {
  id: string;
  name: string;
  models: string[];

  inference(request: InferenceRequest): Promise<InferenceResponse>;
  getPricing(model: string): number;
  healthCheck(): Promise<boolean>;

  // Optional
  imageGeneration?(request: ImageRequest): Promise<ImageResponse>;
  computeRun?(request: ComputeRequest): Promise<ComputeResponse>;
}
```

## Checklist

- [ ] Provider file < 250 lines
- [ ] All models listed with pricing
- [ ] Error handling implemented
- [ ] Health check works
- [ ] Environment variable documented
- [ ] Added to routing engine
- [ ] Tests written
