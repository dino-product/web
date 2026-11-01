/**
 * PKCE(RFC 7636) S256 쌍. 웹 로그인을 시작한 브라우저만 교환 코드를 Access Token으로 바꿀 수 있게 한다.
 * crypto.subtle은 보안 출처(HTTPS·localhost)에서만 동작한다.
 */
function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** code_verifier(무작위 32바이트, 43자)와 그 SHA-256을 base64url로 적은 code_challenge(43자) */
export async function createPkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return { codeVerifier, codeChallenge: base64Url(new Uint8Array(digest)) };
}
