import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";

const PRIVATE_KEY_STORE = "brainlink_x25519_private";
const PUBLIC_KEY_STORE = "brainlink_x25519_public";

export interface KeyPair {
  publicKey: string;  // base64
  privateKey: string; // base64 — stored in OS Keychain/Keystore only
}

/** Generate or retrieve the user's X25519 keypair. */
export async function getOrCreateKeyPair(): Promise<KeyPair> {
  const storedPriv = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
  const storedPub = await SecureStore.getItemAsync(PUBLIC_KEY_STORE);

  if (storedPriv && storedPub) {
    return { publicKey: storedPub, privateKey: storedPriv };
  }

  const kp = nacl.box.keyPair();
  const pub = encodeBase64(kp.publicKey);
  const priv = encodeBase64(kp.secretKey);

  await SecureStore.setItemAsync(PRIVATE_KEY_STORE, priv, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(PUBLIC_KEY_STORE, pub);

  return { publicKey: pub, privateKey: priv };
}

/** Encrypt a JSON payload for a recipient using NaCl box. */
export function encryptForPeer(
  payload: object,
  recipientPublicKeyB64: string,
  ourPrivateKeyB64: string
): { encryptedPayload: string; nonce: string } {
  const recipientPub = decodeBase64(recipientPublicKeyB64);
  const ourPriv = decodeBase64(ourPrivateKeyB64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = encodeUTF8(JSON.stringify(payload));

  const box = nacl.box(message, nonce, recipientPub, ourPriv);
  return {
    encryptedPayload: encodeBase64(box),
    nonce: encodeBase64(nonce),
  };
}

/** Decrypt a NaCl box payload from a peer. Returns null if authentication fails. */
export function decryptFromPeer(
  encryptedPayloadB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  ourPrivateKeyB64: string
): object | null {
  try {
    const box = decodeBase64(encryptedPayloadB64);
    const nonce = decodeBase64(nonceB64);
    const senderPub = decodeBase64(senderPublicKeyB64);
    const ourPriv = decodeBase64(ourPrivateKeyB64);

    const opened = nacl.box.open(box, nonce, senderPub, ourPriv);
    if (!opened) return null;

    return JSON.parse(decodeUTF8(opened)) as object;
  } catch {
    return null;
  }
}
