import { AiCredentialCipher } from './ai-credential-cipher.service';

describe('AiCredentialCipher', () => {
  const previous = process.env.AI_CONFIG_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.AI_CONFIG_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.AI_CONFIG_ENCRYPTION_KEY;
    else process.env.AI_CONFIG_ENCRYPTION_KEY = previous;
  });

  it('cifra y descifra una credencial sin conservarla en texto plano', () => {
    const cipher = new AiCredentialCipher();
    const encrypted = cipher.encrypt('clave-super-secreta');

    expect(encrypted).not.toContain('clave-super-secreta');
    expect(cipher.decrypt(encrypted)).toBe('clave-super-secreta');
  });
});
