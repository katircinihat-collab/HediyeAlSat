require("dotenv").config();
const Iyzipay = require("iyzipay");

const hasIyzicoKeys =
  Boolean(process.env.IYZIPAY_API_KEY) &&
  Boolean(process.env.IYZIPAY_SECRET_KEY) &&
  Boolean(process.env.IYZIPAY_URI);

let iyzipay = null;

if (hasIyzicoKeys) {
  iyzipay = new Iyzipay({
    apiKey: process.env.IYZIPAY_API_KEY,
    secretKey: process.env.IYZIPAY_SECRET_KEY,
    uri: process.env.IYZIPAY_URI,
  });
} else {
  console.warn(
    "Iyzico yapılandırması eksik. Ödeme özellikleri iyzico anahtarları eklenene kadar devre dışı."
  );
}

module.exports = iyzipay;