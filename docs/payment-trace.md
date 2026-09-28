# iyzico Checkout Form / 3DS kanıt toplama

Bu altyapı teşhis içindir; ödeme kurallarını veya sağlayıcı akışını değiştirmez.

## Gerçek akış ve sınırlar

Checkout `siparisler` taslaklarını oluşturur → authenticated POST `/api/payment` → server fiyat/kimlik/satıcı doğrulaması → mevcut stok/Kura rezervasyonu → `odemeler` WAITING kaydı → `checkoutFormInitialize.create` → frontend `paymentPageUrl` yönlendirmesi → iyzico/banka/SMS → POST `/api/payment/callback` → `checkoutForm.retrieve` → doğrulama → mevcut atomik finalization.

Doğrudan `threedsPayment.create/complete` çağrısı yoktur. Banka OTP ekranı ve iyzico `CALLBACK_THREEDS` sunucu tarafından gözlemlenemez. `PAYMENT_FORM_RESPONSE_READY`, yalnız yönlendirme URL'sinin hazır olduğunu kanıtlar; tarayıcının bankaya ulaştığını veya SMS'in doğrulandığını kanıtlamaz.

Callback middleware sırası: erken trace → mevcut CORS → JSON parser → URL-encoded parser (`extended:true`) → callback controller. Callback'te Firebase auth yoktur; ödeme sonucu mevcut iyzico retrieve ile doğrulanır. CORS allowlist, URL, middleware sonucu ve 303 yönlendirmeler değişmedi.

## Tek temiz test

1. Render yeni commit için **Live** olmalı. Startup logunda `TRACE_LOGGING_READY` ve `commit` kontrol edilir.
2. Testin başlangıç/bitiş saatini ve saat dilimini kaydedin. Kullanıcı tek ödeme denemesi yapar; ajan gerçek ödeme başlatmaz.
3. Bankadaki takılma ekranının ekran görüntüsünü alın; OTP, kart, TC, telefon ve diğer kişisel bilgileri göndermeden önce kapatın.
4. Render Logs'ta test zaman aralığının bütün instance/restart kayıtlarını ve `[PAYMENT_TRACE]` satırlarını alın.
5. `PAYMENT_ATTEMPT_CREATED` conversationId, sonraki traceId'dir. İlk requestId `TRACE_CORRELATION` ile buna bağlanır.
6. Initialize response ve callback parse/retrieve request satırlarının aynı `tokenFingerprint` değeri ikinci HTTP isteğini bağlar. Retrieve cevabı geldiğinde conversationId tekrar traceId olur. Erken callback'te token henüz parse edilmediğinden ayrı requestId kullanılır. Bellek eşleştirme cache'i veya yeni Firestore yazısı yoktur; restart sonrası da log bağlantıları korunur.

## iyzico'ya gönderilecek güvenli özet

```text
=== HediyeAlSat 3DS Trace ===
commit:
test window (timezone):
conversationId / traceId:
initialize status / errorCode / paymentId:
tokenFingerprint:
payment form response ready:
callback ingress observed (YES / NOT OBSERVED IN WINDOW):
CORS_PASSED / BODY_PARSERS_PASSED:
callback mdStatusPresent / mdStatus:
retrieve status / paymentStatus / paymentId / errorCode:
PAYMENT_VERIFIED:
ORDER_FINALIZATION_STARTED / COMPLETED:
reservation events:
failure stage / reason / errorCode:
=== END TRACE ===
```

Yalnız whitelist edilmiş `[PAYMENT_TRACE]` satırlarını ekleyin; raw Render loglarını, stackleri veya provider response'unu eklemeyin. Otomatik e-posta gönderimi yoktur. paymentId/conversationId kimlik doğrulama anahtarı değildir ancak operasyonel işlem tanımlayıcılarıdır; yalnız yetkili iyzico destek kanalıyla paylaşılmalıdır.

- **A:** Tam test aralığında callback ingress görülmedi. Bu, uygulamaya ulaşmış bir callback gözlenmediğini gösterir; Render edge/sağlayıcı logları olmadan internette hiç istek yapılmadığını kanıtlamaz. Log kaybı/restart/kapsanmayan instance ihtimalini ayrıca kontrol edin.
- **B:** Callback parse satırında `mdStatusPresent=true, mdStatus=0`. Callback payload'ında mdStatus yoksa `false` yazılır; iyzico'nun kendi iç aşamasındaki mdStatus ile karıştırılmaz.
- **C:** Callback geldi; retrieve veya finalization failure satırı var. CORS reddi `reason=CORS_REJECTED`; parser reddi güvenli reason ile görünür. Middleware geçiş loglarının eksikliği aşamayı ayırır.

Provider/exception serbest hata metinleri PII içerebildiğinden sabit güvenli açıklamayla değiştirilir; errorCode/errorGroup korunur. HTTP SDK raw status vermiyorsa uydurulmaz. HTTP_RESPONSE_FINISHED bizim endpointimizin status'udur. Tam token yerine 12 haneli SHA-256 fingerprint vardır. Kart/CVV/OTP/TC/adres/email/telefon/credential/header/body/HTML/stack loglanmaz.

Log yokluğundan WAITING kaydı FAILED yapılmaz. Bu çalışma 3DS sorununun çözüldüğü anlamına gelmez.
