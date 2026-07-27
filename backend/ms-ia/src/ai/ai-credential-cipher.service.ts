import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** Cifra secretos de proveedor antes de persistirlos. La clave maestra no sale del entorno. */
@Injectable()
export class AiCredentialCipher {
  private readonly key = this.parseKey(process.env.AI_CONFIG_ENCRYPTION_KEY);

  encrypt(value: string): string {
    const key = this.requireKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decrypt(value: string): string {
    const key = this.requireKey();
    const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split('.');
    if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
      throw new ServiceUnavailableException(
        'La credencial de IA almacenada no tiene un formato válido.',
      );
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivEncoded, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('No se pudo descifrar la credencial de IA.');
    }
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new ServiceUnavailableException(
        'Falta AI_CONFIG_ENCRYPTION_KEY en el servidor; no se pueden administrar credenciales de IA.',
      );
    }
    return this.key;
  }

  private parseKey(value: string | undefined): Buffer | null {
    if (!value) return null;
    const key = /^[0-9a-f]{64}$/i.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    return key.length === 32 ? key : null;
  }
}
