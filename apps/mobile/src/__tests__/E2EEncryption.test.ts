import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";
import { encryptForPeer, decryptFromPeer } from "../crypto/E2EEncryption";

function makeKeyPair() {
  const kp = nacl.box.keyPair();
  return { pub: encodeBase64(kp.publicKey), priv: encodeBase64(kp.secretKey) };
}

describe("E2EEncryption", () => {
  it("encrypts and decrypts a ThoughtPacket round-trip", () => {
    const alice = makeKeyPair();
    const bob = makeKeyPair();

    const payload = { state: "focused", intent: "confirm", confidence: 0.85, id: "tp_1" };
    const { encryptedPayload, nonce } = encryptForPeer(payload, bob.pub, alice.priv);

    expect(typeof encryptedPayload).toBe("string");
    expect(typeof nonce).toBe("string");

    const decrypted = decryptFromPeer(encryptedPayload, nonce, alice.pub, bob.priv);
    expect(decrypted).toEqual(payload);
  });

  it("returns null on tampered ciphertext", () => {
    const alice = makeKeyPair();
    const bob = makeKeyPair();

    const { encryptedPayload, nonce } = encryptForPeer({ data: "x" }, bob.pub, alice.priv);
    const tampered = encryptedPayload.slice(0, -4) + "AAAA";
    const result = decryptFromPeer(tampered, nonce, alice.pub, bob.priv);
    expect(result).toBeNull();
  });

  it("returns null when wrong private key used", () => {
    const alice = makeKeyPair();
    const bob = makeKeyPair();
    const charlie = makeKeyPair();

    const { encryptedPayload, nonce } = encryptForPeer({ x: 1 }, bob.pub, alice.priv);
    // Charlie tries to decrypt with his own key
    const result = decryptFromPeer(encryptedPayload, nonce, alice.pub, charlie.priv);
    expect(result).toBeNull();
  });

  it("each encryption produces a unique nonce", () => {
    const alice = makeKeyPair();
    const bob = makeKeyPair();
    const payload = { state: "relaxed" };
    const { nonce: n1 } = encryptForPeer(payload, bob.pub, alice.priv);
    const { nonce: n2 } = encryptForPeer(payload, bob.pub, alice.priv);
    expect(n1).not.toBe(n2);
  });
});
