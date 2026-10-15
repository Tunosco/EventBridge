/**
 * Secure Messaging Cryptography Module
 * Uses the Web Crypto API for RSA-OAEP End-to-End Encryption
 */

const DB_NAME = 'eventbridge_crypto_db';
const STORE_NAME = 'keys';

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePrivateKey(userId, privateKey) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(privateKey, userId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPrivateKey(userId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(userId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function generateUserKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  };
}

export async function encryptMessage(publicKeyBase64, plainText) {
  const binaryDerString = atob(publicKeyBase64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

  const encodedText = new TextEncoder().encode(plainText);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encodedText
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
}

export async function decryptMessage(privateKey, cipherTextBase64) {
  const binaryString = atob(cipherTextBase64);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    binaryData.buffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function initUserSecurity(userId, uploadPublicKeyFn) {
  let privateKey = await getPrivateKey(userId);

  if (!privateKey) {
    const { publicKey, privateKey: newPrivateKey } = await generateUserKeys();
    await savePrivateKey(userId, newPrivateKey);
    await uploadPublicKeyFn(publicKey);
    privateKey = newPrivateKey;
  }

  return privateKey;
}
