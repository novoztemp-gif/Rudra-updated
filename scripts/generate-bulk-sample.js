#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createJWT(invoiceNo, date = new Date().toLocaleDateString('en-IN')) {
  const [day, month, year] = date.split('/');
  const dateForJWT = `${year}/${month}/${day}`;

  const payload = {
    "Data": {
      "Version": "1.1",
      "Irn": crypto.randomBytes(32).toString('hex'),
      "Tran": {
        "Typ": "B2B",
        "SubTyp": "OTH",
        "SupTyp": "B",
        "EcmGstin": null
      },
      "Doc": {
        "Typ": "INV",
        "Num": invoiceNo.toString(),
        "Dtb": dateForJWT
      },
      "Seller": {
        "Gstin": "33AAYFR4969H1ZE",
        "LglNm": "RUDRA GRANITES & TILES",
        "Addr1": "P/ARAICBODE, THUCKALAY",
        "Loc": "THUCKALAY",
        "Pin": 629175,
        "Stcd": "33"
      },
      "Buyer": {
        "Gstin": "URP",
        "LglNm": "Test Customer",
        "Addr1": "Test Address",
        "Loc": "Test City",
        "Pin": 629999,
        "Stcd": "33",
        "Pos": "33"
      }
    }
  };

  const header = { "alg": "RS256", "typ": "JWT" };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(crypto.randomBytes(32).toString('hex'));

  return {
    jwt: `${headerEncoded}.${payloadEncoded}.${signature}`,
    irn: payload.Data.Irn,
    invoiceNo: invoiceNo.toString()
  };
}

// Get invoice numbers from command line arguments
const invoiceNumbers = process.argv.slice(2);

if (invoiceNumbers.length === 0) {
  console.error('❌ No invoice numbers provided');
  console.error('Usage: npm run generate-bulk-sample 4268 4356');
  process.exit(1);
}

console.log(`📋 Generating bulk sample for invoices: ${invoiceNumbers.join(', ')}`);

const signedResponses = invoiceNumbers.map((invNo, idx) => {
  const jwt = createJWT(invNo);
  const ackNo = 1221102000045 + idx;
  const ackDt = new Date();
  ackDt.setMinutes(ackDt.getMinutes() + idx);
  const year = ackDt.getFullYear();
  const month = String(ackDt.getMonth() + 1).padStart(2, '0');
  const day = String(ackDt.getDate()).padStart(2, '0');
  const hour = String(ackDt.getHours()).padStart(2, '0');
  const minute = String(ackDt.getMinutes()).padStart(2, '0');
  const second = String(ackDt.getSeconds()).padStart(2, '0');
  const ackDtStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

  return {
    "Irn": jwt.irn,
    "AckNo": ackNo,
    "AckDt": ackDtStr,
    "Status": "ACT",
    "SignedInvoice": jwt.jwt,
    "SignedQRCode": `GSTN:33AAYFR4969H1ZE:INV:${jwt.invoiceNo}:${new Date().toLocaleDateString('en-IN')}:8500.0:1530.0:0.0:0.0:${jwt.irn}`,
    "EwbNo": null,
    "EwbDt": null,
    "Remarks": null
  };
});

const outputPath = path.join(__dirname, '..', 'samples', 'bulk-signed-response.json');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(signedResponses, null, 2));
console.log(`✅ Generated: ${outputPath}`);
console.log(`📦 File contains ${signedResponses.length} signed response(s)`);
