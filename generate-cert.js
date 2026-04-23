const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Gerar certificado SSL auto-assinado
function generateSSLCertificates() {
  const certPath = './server.cert';
  const keyPath = './server.key';
  
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('Gerando certificados SSL auto-assinados...');
    
    // Gerar chave privada
    const privateKey = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // Salvar chave privada
    fs.writeFileSync(keyPath, privateKey.privateKey);
    
    // Gerar certificado auto-assinado
    const cert = crypto.createSelfSignedCert({
      key: privateKey.privateKey,
      days: 365,
      country: 'BR',
      organization: 'SoundHub',
      commonName: 'localhost'
    });
    
    // Salvar certificado
    fs.writeFileSync(certPath, cert.cert);
    
    console.log('Certificados SSL gerados com sucesso!');
    console.log('Chave privada:', keyPath);
    console.log('Certificado:', certPath);
  } else {
    console.log('Certificados SSL já existem.');
  }
}

generateSSLCertificates();
