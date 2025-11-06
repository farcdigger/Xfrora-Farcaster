# CRITICAL x402 DEBUG

## SORUN
Middleware payment header'ı doğrulayamıyor - sürekli 402 dönüyor.

## MEVCUT DURUM

### Client EIP-712 Signature:
```javascript
domain: {
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}

types: {
  TransferWithAuthorization: [
    { name: "amount", type: "string" },
    { name: "asset", type: "string" },
    { name: "network", type: "string" },
    { name: "recipient", type: "address" },
    { name: "payer", type: "address" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce", type: "string" }
  ]
}
```

### Middleware Response (402):
```json
{
  "extra": {
    "name": "USD Coin",
    "version": "2"
  }
}
```

## ŞÜPHELİ NOKTALAR

1. **Type name mismatch?**
   - Biz: `TransferWithAuthorization`
   - Middleware belki başka bir type name bekliyor?

2. **Field order?**
   - EIP-712'de field order önemli
   - Middleware farklı sıralama bekliyor olabilir

3. **CDP Facilitator bekliyor ama çalışmıyor?**
   - `CDP_API_KEY_ID` ve `CDP_API_KEY_SECRET` doğru mu?
   - Keys'lerin x402 permission'ı var mı?

## YAPILACAKLAR

1. ✅ Vercel logs kontrol et - middleware ne diyor?
2. ✅ CDP keys'lerin permission'larını kontrol et
3. ✅ x402-next middleware'inin beklediği EXACT format'ı bul

