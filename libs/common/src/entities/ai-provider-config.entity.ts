import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AiProviderName = 'groq' | 'gemini' | 'deepseek' | 'openai';

@Entity('ai_provider_configs')
export class AiProviderConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  provider: AiProviderName;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'int', default: 100 })
  priority: number;

  /** Cifrada con AES-256-GCM; nunca se expone por los endpoints. */
  @Column({ type: 'text', nullable: true })
  api_key_encrypted: string | null;

  @Column({ type: 'varchar', length: 500 })
  base_url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  text_model: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  vision_model: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizado_en: Date;
}
