import { ethers } from 'ethers';

export async function getBrowserSigner(): Promise<ethers.Signer> {
  if (typeof window === 'undefined') throw new Error('Browser only');
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

export async function initAccount(signer: ethers.Signer) {
  const address = await signer.getAddress();
  sessionStorage.setItem('neturion_wallet', address);
  return address;
}

export function encryptPrompt(prompt: string): string {
  return ethers.hexlify(ethers.toUtf8Bytes(prompt));
}

export function decryptResponse(encoded: string): string {
  try {
    return ethers.toUtf8String(ethers.getBytes(encoded));
  } catch {
    return encoded;
  }
}
